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
