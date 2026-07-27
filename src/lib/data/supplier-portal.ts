import "server-only";
import { and, eq, desc, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  supplier,
  purchaseOrder,
  purchaseOrderItem,
  shipment,
  nonConformity,
  qualityInspection,
  supplierEvaluation,
  currency,
} from "@/lib/db/schema";

export async function getSupplierName(tenantId: string, supplierId: string) {
  const rows = await db
    .select({ legalName: supplier.legalName, tradeName: supplier.tradeName, code: supplier.code })
    .from(supplier)
    .where(and(eq(supplier.id, supplierId), eq(supplier.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function supplierPortalOverview(tenantId: string, supplierId: string) {
  const po = await db
    .select({
      open: sql<string>`count(*) filter (where ${purchaseOrder.status} not in ('rascunho','recebido','cancelado'))`,
      committed: sql<string>`coalesce(sum(${purchaseOrder.totalAmount}) filter (where ${purchaseOrder.status} not in ('rascunho','cancelado')), 0)`,
    })
    .from(purchaseOrder)
    .where(and(eq(purchaseOrder.tenantId, tenantId), eq(purchaseOrder.supplierId, supplierId)));

  const sh = await db
    .select({
      inTransit: sql<string>`count(*) filter (where ${shipment.status} in ('em_transito','desembaraco'))`,
    })
    .from(shipment)
    .where(and(eq(shipment.tenantId, tenantId), eq(shipment.supplierId, supplierId)));

  const nc = await db
    .select({
      open: sql<string>`count(*) filter (where ${nonConformity.status} in ('aberta','em_tratamento'))`,
    })
    .from(nonConformity)
    .where(and(eq(nonConformity.tenantId, tenantId), eq(nonConformity.supplierId, supplierId)));

  const ev = await db
    .select({ overall: supplierEvaluation.overallScore, riskLevel: supplierEvaluation.riskLevel })
    .from(supplierEvaluation)
    .where(and(eq(supplierEvaluation.tenantId, tenantId), eq(supplierEvaluation.supplierId, supplierId)))
    .orderBy(desc(supplierEvaluation.createdAt))
    .limit(1);

  return {
    openPos: Number(po[0]?.open ?? 0),
    committed: po[0]?.committed ?? "0",
    inTransit: Number(sh[0]?.inTransit ?? 0),
    openNc: Number(nc[0]?.open ?? 0),
    latestScore: ev[0]?.overall ?? null,
    latestRisk: ev[0]?.riskLevel ?? null,
  };
}

export async function listSupplierPos(tenantId: string, supplierId: string) {
  return db
    .select({
      id: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      status: purchaseOrder.status,
      totalAmount: purchaseOrder.totalAmount,
      orderDate: purchaseOrder.orderDate,
      expectedDate: purchaseOrder.expectedDate,
      currencyIso: currency.isoCode,
    })
    .from(purchaseOrder)
    .leftJoin(currency, eq(currency.id, purchaseOrder.currencyId))
    .where(and(eq(purchaseOrder.tenantId, tenantId), eq(purchaseOrder.supplierId, supplierId)))
    .orderBy(desc(purchaseOrder.createdAt))
    .limit(200);
}

export async function getSupplierPoDetail(tenantId: string, supplierId: string, id: string) {
  const rows = await db
    .select({
      id: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      status: purchaseOrder.status,
      totalAmount: purchaseOrder.totalAmount,
      orderDate: purchaseOrder.orderDate,
      expectedDate: purchaseOrder.expectedDate,
      receivedDate: purchaseOrder.receivedDate,
      incoterm: purchaseOrder.incoterm,
      notes: purchaseOrder.notes,
      currencyIso: currency.isoCode,
    })
    .from(purchaseOrder)
    .leftJoin(currency, eq(currency.id, purchaseOrder.currencyId))
    .where(
      and(
        eq(purchaseOrder.id, id),
        eq(purchaseOrder.tenantId, tenantId),
        eq(purchaseOrder.supplierId, supplierId),
      ),
    )
    .limit(1);
  const head = rows[0];
  if (!head) return null;
  const items = await db
    .select()
    .from(purchaseOrderItem)
    .where(eq(purchaseOrderItem.purchaseOrderId, id));
  return { order: head, items };
}

export async function listSupplierShipments(tenantId: string, supplierId: string) {
  return db
    .select({
      id: shipment.id,
      shipmentNumber: shipment.shipmentNumber,
      status: shipment.status,
      carrier: shipment.carrier,
      trackingCode: shipment.trackingCode,
      origin: shipment.origin,
      destination: shipment.destination,
      eta: shipment.eta,
      deliveredAt: shipment.deliveredAt,
      poNumber: purchaseOrder.poNumber,
    })
    .from(shipment)
    .leftJoin(purchaseOrder, eq(purchaseOrder.id, shipment.purchaseOrderId))
    .where(and(eq(shipment.tenantId, tenantId), eq(shipment.supplierId, supplierId)))
    .orderBy(desc(shipment.createdAt))
    .limit(200);
}

export async function listSupplierNcs(tenantId: string, supplierId: string) {
  return db
    .select({
      id: nonConformity.id,
      ncNumber: nonConformity.ncNumber,
      severity: nonConformity.severity,
      status: nonConformity.status,
      description: nonConformity.description,
      disposition: nonConformity.disposition,
      correctiveAction: nonConformity.correctiveAction,
      openedAt: nonConformity.openedAt,
      resolvedAt: nonConformity.resolvedAt,
      inspectionNumber: qualityInspection.inspectionNumber,
      inspectionTitle: qualityInspection.title,
    })
    .from(nonConformity)
    .leftJoin(qualityInspection, eq(qualityInspection.id, nonConformity.qualityInspectionId))
    .where(and(eq(nonConformity.tenantId, tenantId), eq(nonConformity.supplierId, supplierId)))
    .orderBy(desc(nonConformity.createdAt))
    .limit(200);
}

/**
 * Resposta do fornecedor a uma não-conformidade: registra/atualiza a ação
 * corretiva. Se estiver aberta, passa para "em tratamento". Isolado ao supplier.
 */
export async function respondSupplierNc(
  tenantId: string,
  supplierId: string,
  ncId: string,
  correctiveAction: string,
): Promise<void> {
  const rows = await db
    .select({ id: nonConformity.id, status: nonConformity.status })
    .from(nonConformity)
    .where(
      and(
        eq(nonConformity.id, ncId),
        eq(nonConformity.tenantId, tenantId),
        eq(nonConformity.supplierId, supplierId),
      ),
    )
    .limit(1);
  if (!rows[0]) throw new Error("Não-conformidade não encontrada.");
  const patch: { correctiveAction: string; updatedAt: Date; status?: "em_tratamento" } = {
    correctiveAction,
    updatedAt: new Date(),
  };
  if (rows[0].status === "aberta") patch.status = "em_tratamento";
  await db
    .update(nonConformity)
    .set(patch)
    .where(and(eq(nonConformity.id, ncId), eq(nonConformity.tenantId, tenantId), eq(nonConformity.supplierId, supplierId)));
}

export async function listSupplierEvaluations(tenantId: string, supplierId: string) {
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
      evaluatedAt: supplierEvaluation.evaluatedAt,
    })
    .from(supplierEvaluation)
    .where(and(eq(supplierEvaluation.tenantId, tenantId), eq(supplierEvaluation.supplierId, supplierId)))
    .orderBy(desc(supplierEvaluation.createdAt));
}
