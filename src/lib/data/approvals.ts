import "server-only";
import { and, eq, asc, desc, inArray, sql, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  approvalTier,
  requisitionApprovalStep,
  purchaseRequisition,
  purchaseRequisitionItem,
  appUser,
} from "@/lib/db/schema";

/* ---------------------------------------------------------------------------
 * Matriz de alçadas (configurável)
 * ------------------------------------------------------------------------- */

export async function listApprovalTiers(tenantId: string) {
  return db
    .select({
      id: approvalTier.id,
      sequence: approvalTier.sequence,
      label: approvalTier.label,
      threshold: approvalTier.threshold,
      active: approvalTier.active,
    })
    .from(approvalTier)
    .where(and(eq(approvalTier.tenantId, tenantId), eq(approvalTier.active, true)))
    .orderBy(asc(approvalTier.sequence));
}

export type Tier = { id: string; sequence: number; label: string; threshold: string };

/** Níveis exigidos para um valor (cumulativo): todos os níveis com threshold ≤ valor. */
export function requiredTiers<T extends { sequence: number; threshold: string | number }>(
  tiers: T[],
  value: number,
): T[] {
  const req = tiers
    .filter((t) => Number(t.threshold) <= value)
    .sort((a, b) => a.sequence - b.sequence);
  return req.length ? req : tiers.slice().sort((a, b) => a.sequence - b.sequence).slice(0, 1);
}

/** Rótulo da alçada máxima exigida para um valor (para exibição). */
export async function alcadaFor(tenantId: string, value: number): Promise<string> {
  const tiers = await listApprovalTiers(tenantId);
  const req = requiredTiers(tiers, value);
  return req[req.length - 1]?.label ?? "—";
}

export async function requisitionEstimatedTotal(tenantId: string, reqId: string): Promise<number> {
  const r = await db
    .select({
      total: sql<string>`coalesce(sum(${purchaseRequisitionItem.quantity} * ${purchaseRequisitionItem.estimatedUnitPrice}), 0)`,
    })
    .from(purchaseRequisitionItem)
    .where(
      and(
        eq(purchaseRequisitionItem.tenantId, tenantId),
        eq(purchaseRequisitionItem.purchaseRequisitionId, reqId),
      ),
    );
  return Number(r[0]?.total ?? 0);
}

/* ---------------------------------------------------------------------------
 * Etapas de aprovação por requisição
 * ------------------------------------------------------------------------- */

/** Gera as etapas de aprovação da requisição conforme o valor (idempotente). */
export async function generateApprovalSteps(tenantId: string, reqId: string): Promise<void> {
  const existing = await db
    .select({ c: count() })
    .from(requisitionApprovalStep)
    .where(
      and(
        eq(requisitionApprovalStep.tenantId, tenantId),
        eq(requisitionApprovalStep.purchaseRequisitionId, reqId),
      ),
    );
  if (Number(existing[0]?.c ?? 0) > 0) return;

  const total = await requisitionEstimatedTotal(tenantId, reqId);
  const tiers = await listApprovalTiers(tenantId);
  const req = requiredTiers(tiers, total);
  if (!req.length) return;
  await db.insert(requisitionApprovalStep).values(
    req.map((t, i) => ({
      tenantId,
      purchaseRequisitionId: reqId,
      sequence: i + 1,
      tierLabel: t.label,
    })),
  );
}

export async function listRequisitionSteps(tenantId: string, reqId: string) {
  return db
    .select({
      id: requisitionApprovalStep.id,
      sequence: requisitionApprovalStep.sequence,
      tierLabel: requisitionApprovalStep.tierLabel,
      status: requisitionApprovalStep.status,
      decidedAt: requisitionApprovalStep.decidedAt,
      comment: requisitionApprovalStep.comment,
      decidedByName: appUser.name,
    })
    .from(requisitionApprovalStep)
    .leftJoin(appUser, eq(appUser.id, requisitionApprovalStep.decidedBy))
    .where(
      and(
        eq(requisitionApprovalStep.tenantId, tenantId),
        eq(requisitionApprovalStep.purchaseRequisitionId, reqId),
      ),
    )
    .orderBy(asc(requisitionApprovalStep.sequence));
}

/**
 * Decide a etapa pendente atual (menor sequência ainda pendente). Aprovar avança
 * para o próximo nível; a última aprovação aprova a requisição. Reprovar reprova tudo.
 */
export async function decideCurrentStep(
  tenantId: string,
  reqId: string,
  decision: "aprovada" | "reprovada",
  comment: string | null,
  userId: string,
): Promise<{ final: "aprovada" | "reprovada" | null; tierLabel: string }> {
  await generateApprovalSteps(tenantId, reqId); // backfill caso a requisição seja antiga

  // Segregação de funções: o solicitante não pode decidir a própria requisição.
  const reqRow = await db
    .select({ requester: purchaseRequisition.requesterUserId })
    .from(purchaseRequisition)
    .where(and(eq(purchaseRequisition.id, reqId), eq(purchaseRequisition.tenantId, tenantId)))
    .limit(1);
  if (reqRow[0]?.requester && reqRow[0].requester === userId) {
    throw new Error(
      "Segregação de funções: você não pode aprovar ou reprovar a própria requisição.",
    );
  }

  const steps = await db
    .select()
    .from(requisitionApprovalStep)
    .where(
      and(
        eq(requisitionApprovalStep.tenantId, tenantId),
        eq(requisitionApprovalStep.purchaseRequisitionId, reqId),
      ),
    )
    .orderBy(asc(requisitionApprovalStep.sequence));
  const current = steps.find((s) => s.status === "pendente");
  if (!current) throw new Error("Não há etapa de aprovação pendente.");

  await db
    .update(requisitionApprovalStep)
    .set({ status: decision, decidedBy: userId, decidedAt: new Date(), comment })
    .where(eq(requisitionApprovalStep.id, current.id));

  if (decision === "reprovada") {
    await db
      .update(purchaseRequisition)
      .set({
        status: "reprovada",
        decidedBy: userId,
        decidedAt: new Date(),
        decisionComment: comment,
        updatedAt: new Date(),
      })
      .where(and(eq(purchaseRequisition.id, reqId), eq(purchaseRequisition.tenantId, tenantId)));
    return { final: "reprovada", tierLabel: current.tierLabel };
  }

  const stillPending = steps.some((s) => s.id !== current.id && s.status === "pendente");
  if (!stillPending) {
    await db
      .update(purchaseRequisition)
      .set({
        status: "aprovada",
        decidedBy: userId,
        decidedAt: new Date(),
        decisionComment: comment,
        updatedAt: new Date(),
      })
      .where(and(eq(purchaseRequisition.id, reqId), eq(purchaseRequisition.tenantId, tenantId)));
    return { final: "aprovada", tierLabel: current.tierLabel };
  }
  return { final: null, tierLabel: current.tierLabel };
}

/* ---------------------------------------------------------------------------
 * Fila de aprovações (pendentes por alçada)
 * ------------------------------------------------------------------------- */

export type PendingApproval = {
  reqId: string;
  requisitionNumber: string;
  title: string;
  requesterName: string | null;
  neededBy: string | null;
  estimatedTotal: number;
  currentTier: string;
  currentSeq: number;
  totalSteps: number;
  approvedSteps: number;
};

export async function listPendingApprovals(tenantId: string): Promise<PendingApproval[]> {
  const reqs = await db
    .select({
      id: purchaseRequisition.id,
      requisitionNumber: purchaseRequisition.requisitionNumber,
      title: purchaseRequisition.title,
      neededBy: purchaseRequisition.neededBy,
      requesterName: appUser.name,
    })
    .from(purchaseRequisition)
    .leftJoin(appUser, eq(appUser.id, purchaseRequisition.requesterUserId))
    .where(
      and(eq(purchaseRequisition.tenantId, tenantId), eq(purchaseRequisition.status, "enviada")),
    )
    .orderBy(desc(purchaseRequisition.createdAt));
  if (!reqs.length) return [];

  const ids = reqs.map((r) => r.id);
  const [steps, totals] = await Promise.all([
    db
      .select()
      .from(requisitionApprovalStep)
      .where(
        and(
          eq(requisitionApprovalStep.tenantId, tenantId),
          inArray(requisitionApprovalStep.purchaseRequisitionId, ids),
        ),
      )
      .orderBy(asc(requisitionApprovalStep.sequence)),
    db
      .select({
        reqId: purchaseRequisitionItem.purchaseRequisitionId,
        total: sql<string>`coalesce(sum(${purchaseRequisitionItem.quantity} * ${purchaseRequisitionItem.estimatedUnitPrice}), 0)`,
      })
      .from(purchaseRequisitionItem)
      .where(inArray(purchaseRequisitionItem.purchaseRequisitionId, ids))
      .groupBy(purchaseRequisitionItem.purchaseRequisitionId),
  ]);

  const out: PendingApproval[] = [];
  for (const r of reqs) {
    const mySteps = steps.filter((s) => s.purchaseRequisitionId === r.id);
    const current = mySteps.find((s) => s.status === "pendente");
    if (!current) continue; // sem etapa pendente (ou sem etapas ainda)
    out.push({
      reqId: r.id,
      requisitionNumber: r.requisitionNumber,
      title: r.title,
      requesterName: r.requesterName,
      neededBy: r.neededBy as unknown as string | null,
      estimatedTotal: Number(totals.find((t) => t.reqId === r.id)?.total ?? 0),
      currentTier: current.tierLabel,
      currentSeq: current.sequence,
      totalSteps: mySteps.length,
      approvedSteps: mySteps.filter((s) => s.status === "aprovada").length,
    });
  }
  return out;
}

export async function approvalKpis(tenantId: string) {
  const pending = await listPendingApprovals(tenantId);
  const totalValue = pending.reduce((s, p) => s + p.estimatedTotal, 0);
  const byTier = new Map<string, number>();
  for (const p of pending) byTier.set(p.currentTier, (byTier.get(p.currentTier) ?? 0) + 1);
  return {
    pendingCount: pending.length,
    totalValue,
    byTier: [...byTier.entries()].map(([label, count]) => ({ label, count })),
  };
}
