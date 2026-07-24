import "server-only";
import { and, eq, isNull, desc, count, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { product, brand, licensee, productApproval, approvalStage } from "@/lib/db/schema";

export async function listProducts(tenantId: string) {
  const rows = await db
    .select({
      id: product.id,
      sku: product.sku,
      name: product.name,
      status: product.status,
      currentVersion: product.currentVersion,
      brandName: brand.name,
      licenseeName: licensee.legalName,
      approvalId: productApproval.id,
    })
    .from(product)
    .leftJoin(brand, eq(brand.id, product.brandId))
    .leftJoin(licensee, eq(licensee.id, product.licenseeId))
    .leftJoin(
      productApproval,
      and(eq(productApproval.productId, product.id), eq(productApproval.version, product.currentVersion)),
    )
    .where(and(eq(product.tenantId, tenantId), isNull(product.deletedAt)))
    .orderBy(desc(product.createdAt))
    .limit(200);

  const apprIds = rows.map((r) => r.approvalId).filter((x): x is string => Boolean(x));
  const progress = new Map<string, { done: number; total: number }>();
  if (apprIds.length) {
    const counts = await db
      .select({
        approvalId: approvalStage.productApprovalId,
        total: sql<number>`count(*)::int`,
        done: sql<number>`count(*) filter (where ${approvalStage.decision} = 'aprovado')::int`,
      })
      .from(approvalStage)
      .where(inArray(approvalStage.productApprovalId, apprIds))
      .groupBy(approvalStage.productApprovalId);
    for (const c of counts) progress.set(c.approvalId, { done: c.done, total: c.total });
  }

  return rows.map((r) => {
    const p = r.approvalId ? progress.get(r.approvalId) : undefined;
    return { ...r, done: p?.done ?? 0, total: p?.total ?? 0 };
  });
}

export async function getProductDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: product.id,
      sku: product.sku,
      name: product.name,
      productLine: product.productLine,
      status: product.status,
      brandName: brand.name,
      licenseeName: licensee.legalName,
      supplierName: product.supplierName,
      material: product.material,
      color: product.color,
      suggestedPrice: product.suggestedPrice,
      barcode: product.barcode,
      currentVersion: product.currentVersion,
    })
    .from(product)
    .leftJoin(brand, eq(brand.id, product.brandId))
    .leftJoin(licensee, eq(licensee.id, product.licenseeId))
    .where(and(eq(product.id, id), eq(product.tenantId, tenantId)))
    .limit(1);
  const prod = rows[0];
  if (!prod) return null;

  const appr = await db
    .select()
    .from(productApproval)
    .where(and(eq(productApproval.productId, id), eq(productApproval.tenantId, tenantId)))
    .orderBy(desc(productApproval.version))
    .limit(1);
  const approval = appr[0] ?? null;

  const stages = approval
    ? await db
        .select()
        .from(approvalStage)
        .where(eq(approvalStage.productApprovalId, approval.id))
        .orderBy(approvalStage.sequence)
    : [];

  return { product: prod, approval, stages };
}

/** Todas as versões de aprovação de um produto (para o histórico de versões). */
export async function getProductApprovalVersions(tenantId: string, productId: string) {
  return db
    .select({
      id: productApproval.id,
      version: productApproval.version,
      status: productApproval.status,
      overallDecision: productApproval.overallDecision,
      submittedAt: productApproval.submittedAt,
      decidedAt: productApproval.decidedAt,
    })
    .from(productApproval)
    .where(and(eq(productApproval.productId, productId), eq(productApproval.tenantId, tenantId)))
    .orderBy(desc(productApproval.version));
}

/** Aprova a próxima etapa pendente; se todas ficarem aprovadas, aprova o produto. */
export async function approveNextStage(tenantId: string, approvalId: string) {
  const owner = await db
    .select({ id: productApproval.id, productId: productApproval.productId })
    .from(productApproval)
    .where(and(eq(productApproval.id, approvalId), eq(productApproval.tenantId, tenantId)))
    .limit(1);
  if (!owner[0]) return;

  const pending = await db
    .select()
    .from(approvalStage)
    .where(and(eq(approvalStage.productApprovalId, approvalId), eq(approvalStage.decision, "pendente")))
    .orderBy(approvalStage.sequence)
    .limit(1);
  const stage = pending[0];
  if (!stage) return;

  await db
    .update(approvalStage)
    .set({ decision: "aprovado", decidedAt: new Date(), updatedAt: new Date() })
    .where(eq(approvalStage.id, stage.id));

  const remaining = await db
    .select({ c: count() })
    .from(approvalStage)
    .where(and(eq(approvalStage.productApprovalId, approvalId), eq(approvalStage.decision, "pendente")));

  if ((remaining[0]?.c ?? 0) === 0) {
    await db
      .update(productApproval)
      .set({ status: "aprovado", overallDecision: "aprovado", decidedAt: new Date(), updatedAt: new Date() })
      .where(eq(productApproval.id, approvalId));
    await db
      .update(product)
      .set({ status: "aprovado", updatedAt: new Date() })
      .where(eq(product.id, owner[0].productId));
  }
}

type StageDecision = "aprovado" | "aprovado_com_ressalvas" | "reprovado";

/**
 * Registra o parecer de uma alçada (aprovar, aprovar com ressalvas ou reprovar) com comentário.
 * - Reprovação: encerra o fluxo e reprova o produto.
 * - Aprovação (com ou sem ressalvas): se for a última alçada, aprova o produto
 *   (com ressalvas se qualquer alçada teve ressalva). Idempotente por alçada.
 */
export async function decideStage(
  tenantId: string,
  stageId: string,
  decision: StageDecision,
  comment: string | null,
  userId: string,
) {
  const rows = await db
    .select({
      approvalId: approvalStage.productApprovalId,
      stageDecision: approvalStage.decision,
      productId: productApproval.productId,
    })
    .from(approvalStage)
    .innerJoin(productApproval, eq(productApproval.id, approvalStage.productApprovalId))
    .where(and(eq(approvalStage.id, stageId), eq(approvalStage.tenantId, tenantId)))
    .limit(1);
  const row = rows[0];
  if (!row) return;
  if (row.stageDecision !== "pendente") return; // idempotência: já decidida

  const { approvalId, productId } = row;

  await db
    .update(approvalStage)
    .set({ decision, comment: comment ?? null, assigneeUserId: userId, decidedAt: new Date(), updatedAt: new Date() })
    .where(eq(approvalStage.id, stageId));

  if (decision === "reprovado") {
    await db
      .update(productApproval)
      .set({ status: "reprovado", overallDecision: "reprovado", decidedAt: new Date(), updatedAt: new Date() })
      .where(eq(productApproval.id, approvalId));
    await db
      .update(product)
      .set({ status: "reprovado", updatedAt: new Date() })
      .where(and(eq(product.id, productId), eq(product.tenantId, tenantId)));
    return;
  }

  const all = await db
    .select({ decision: approvalStage.decision })
    .from(approvalStage)
    .where(eq(approvalStage.productApprovalId, approvalId));
  const remaining = all.filter((s) => s.decision === "pendente").length;

  if (remaining > 0) {
    // Ainda há alçadas pendentes: mantém o produto em aprovação.
    await db
      .update(product)
      .set({ status: "em_aprovacao", updatedAt: new Date() })
      .where(and(eq(product.id, productId), eq(product.tenantId, tenantId), eq(product.status, "submetido")));
    return;
  }

  // Todas decididas, sem reprovação → aprovado (com ressalvas se alguma alçada teve ressalva).
  const withCaveats = all.some((s) => s.decision === "aprovado_com_ressalvas");
  const finalStatus = withCaveats ? "aprovado_com_ressalvas" : "aprovado";
  await db
    .update(productApproval)
    .set({ status: finalStatus, overallDecision: finalStatus, decidedAt: new Date(), updatedAt: new Date() })
    .where(eq(productApproval.id, approvalId));
  await db
    .update(product)
    .set({ status: finalStatus, updatedAt: new Date() })
    .where(and(eq(product.id, productId), eq(product.tenantId, tenantId)));
}
