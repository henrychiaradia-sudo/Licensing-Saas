import "server-only";
import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  supplier,
  supplierEvaluation,
  qualityInspection,
  nonConformity,
  purchaseOrder,
} from "@/lib/db/schema";
import type { SupplierRiskLevel } from "@/lib/db/schema";

/**
 * Performance derivada de dados reais: qualidade (inspeções/NCs), entrega
 * (pontualidade dos pedidos recebidos) e gasto comprometido.
 */
export async function computeSupplierPerformance(tenantId: string, supplierId: string) {
  const q = await db
    .select({
      total: sql<string>`count(*)`,
      approved: sql<string>`count(*) filter (where ${qualityInspection.result} in ('aprovado','aprovado_condicional'))`,
      reproved: sql<string>`count(*) filter (where ${qualityInspection.result} = 'reprovado')`,
    })
    .from(qualityInspection)
    .where(and(eq(qualityInspection.tenantId, tenantId), eq(qualityInspection.supplierId, supplierId)));

  const nc = await db
    .select({
      open: sql<string>`count(*) filter (where ${nonConformity.status} in ('aberta','em_tratamento'))`,
    })
    .from(nonConformity)
    .where(and(eq(nonConformity.tenantId, tenantId), eq(nonConformity.supplierId, supplierId)));

  const del = await db
    .select({
      received: sql<string>`count(*) filter (where ${purchaseOrder.receivedDate} is not null)`,
      onTime: sql<string>`count(*) filter (where ${purchaseOrder.receivedDate} is not null and ${purchaseOrder.expectedDate} is not null and ${purchaseOrder.receivedDate} <= ${purchaseOrder.expectedDate})`,
      committedSpend: sql<string>`coalesce(sum(${purchaseOrder.totalAmount}) filter (where ${purchaseOrder.status} not in ('rascunho','cancelado')), 0)`,
      poCount: sql<string>`count(*) filter (where ${purchaseOrder.status} not in ('rascunho','cancelado'))`,
    })
    .from(purchaseOrder)
    .where(and(eq(purchaseOrder.tenantId, tenantId), eq(purchaseOrder.supplierId, supplierId)));

  const qTotal = Number(q[0]?.total ?? 0);
  const approved = Number(q[0]?.approved ?? 0);
  const reproved = Number(q[0]?.reproved ?? 0);
  const decided = approved + reproved;
  const received = Number(del[0]?.received ?? 0);
  const onTime = Number(del[0]?.onTime ?? 0);

  return {
    inspections: qTotal,
    approvalRate: decided > 0 ? Math.round((approved / decided) * 100) : null,
    openNc: Number(nc[0]?.open ?? 0),
    ordersReceived: received,
    onTimeRate: received > 0 ? Math.round((onTime / received) * 100) : null,
    committedSpend: del[0]?.committedSpend ?? "0",
    poCount: Number(del[0]?.poCount ?? 0),
  };
}

export async function listEvaluations(tenantId: string, supplierId: string) {
  return db
    .select({
      id: supplierEvaluation.id,
      periodLabel: supplierEvaluation.periodLabel,
      qualityScore: supplierEvaluation.qualityScore,
      deliveryScore: supplierEvaluation.deliveryScore,
      costScore: supplierEvaluation.costScore,
      complianceScore: supplierEvaluation.complianceScore,
      overallScore: supplierEvaluation.overallScore,
      riskLevel: supplierEvaluation.riskLevel,
      strengths: supplierEvaluation.strengths,
      weaknesses: supplierEvaluation.weaknesses,
      notes: supplierEvaluation.notes,
      evaluatedAt: supplierEvaluation.evaluatedAt,
    })
    .from(supplierEvaluation)
    .where(and(eq(supplierEvaluation.tenantId, tenantId), eq(supplierEvaluation.supplierId, supplierId)))
    .orderBy(desc(supplierEvaluation.createdAt));
}

/** Última avaliação (com risco) por fornecedor — usado no scorecard geral e distribuição de risco. */
export async function listLatestEvaluations(tenantId: string) {
  const rows = await db
    .select({
      supplierId: supplierEvaluation.supplierId,
      supplierName: supplier.legalName,
      periodLabel: supplierEvaluation.periodLabel,
      overallScore: supplierEvaluation.overallScore,
      riskLevel: supplierEvaluation.riskLevel,
      createdAt: supplierEvaluation.createdAt,
      rn: sql<number>`row_number() over (partition by ${supplierEvaluation.supplierId} order by ${supplierEvaluation.createdAt} desc)`,
    })
    .from(supplierEvaluation)
    .leftJoin(supplier, eq(supplier.id, supplierEvaluation.supplierId))
    .where(eq(supplierEvaluation.tenantId, tenantId));
  return rows.filter((r) => Number(r.rn) === 1);
}

export type EvaluationInput = {
  supplierId: string;
  periodLabel: string;
  qualityScore: number;
  deliveryScore: number;
  costScore: number;
  complianceScore: number;
  riskLevel: SupplierRiskLevel;
  strengths: string | null;
  weaknesses: string | null;
  notes: string | null;
  evaluatedAt: string | null;
};

export async function createEvaluation(
  tenantId: string,
  input: EvaluationInput,
  userId: string,
): Promise<{ id: string }> {
  const s = await db
    .select({ id: supplier.id })
    .from(supplier)
    .where(and(eq(supplier.id, input.supplierId), eq(supplier.tenantId, tenantId)))
    .limit(1);
  if (!s[0]) throw new Error("Fornecedor inválido.");

  const overall = Math.round(
    (input.qualityScore + input.deliveryScore + input.costScore + input.complianceScore) / 4,
  );

  const inserted = await db
    .insert(supplierEvaluation)
    .values({
      tenantId,
      supplierId: input.supplierId,
      periodLabel: input.periodLabel,
      qualityScore: input.qualityScore,
      deliveryScore: input.deliveryScore,
      costScore: input.costScore,
      complianceScore: input.complianceScore,
      overallScore: overall,
      riskLevel: input.riskLevel,
      strengths: input.strengths,
      weaknesses: input.weaknesses,
      notes: input.notes,
      evaluatedAt: input.evaluatedAt,
      createdBy: userId,
    })
    .returning({ id: supplierEvaluation.id });
  return { id: inserted[0].id };
}
