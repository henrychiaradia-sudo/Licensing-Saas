import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { royaltyReport, receivable, purchaseOrder, supplier, licensee } from "@/lib/db/schema";
import { scopeConds, type ViewScope } from "@/lib/view";

export type Slice = { label: string; value: number };

export async function royaltiesByCompetencia(tenantId: string, scope?: ViewScope): Promise<Slice[]> {
  const rows = await db
    .select({
      label: royaltyReport.referenceLabel,
      value: sql<string>`sum(${royaltyReport.royaltyCalculated})`,
    })
    .from(royaltyReport)
    .where(and(eq(royaltyReport.tenantId, tenantId), ...scopeConds(scope, { licensee: royaltyReport.licenseeId, contract: royaltyReport.contractId })))
    .groupBy(royaltyReport.referenceLabel)
    .orderBy(royaltyReport.referenceLabel);
  return rows.map((r) => ({ label: r.label, value: Number(r.value) }));
}

export async function purchasesBySupplier(tenantId: string, scope?: ViewScope): Promise<Slice[]> {
  const rows = await db
    .select({
      label: supplier.legalName,
      value: sql<string>`sum(${purchaseOrder.totalAmount})`,
    })
    .from(purchaseOrder)
    .leftJoin(supplier, eq(supplier.id, purchaseOrder.supplierId))
    .where(
      and(
        eq(purchaseOrder.tenantId, tenantId),
        sql`${purchaseOrder.status} <> 'cancelado'`,
        ...scopeConds(scope, { supplier: purchaseOrder.supplierId, licensee: purchaseOrder.licenseeId }),
      ),
    )
    .groupBy(supplier.legalName)
    .orderBy(sql`sum(${purchaseOrder.totalAmount}) desc`);
  return rows.map((r) => ({ label: r.label ?? "—", value: Number(r.value) }));
}

export async function receivablesByStatus(tenantId: string, scope?: ViewScope): Promise<Slice[]> {
  const rows = await db
    .select({
      label: receivable.status,
      value: sql<string>`sum(${receivable.amount})`,
    })
    .from(receivable)
    .where(and(eq(receivable.tenantId, tenantId), ...scopeConds(scope, { licensee: receivable.licenseeId, contract: receivable.contractId })))
    .groupBy(receivable.status)
    .orderBy(sql`sum(${receivable.amount}) desc`);
  return rows.map((r) => ({ label: r.label, value: Number(r.value) }));
}

export async function revenueByLicensee(tenantId: string, scope?: ViewScope): Promise<Slice[]> {
  const rows = await db
    .select({
      label: licensee.legalName,
      value: sql<string>`sum(${receivable.amount})`,
    })
    .from(receivable)
    .leftJoin(licensee, eq(licensee.id, receivable.licenseeId))
    .where(and(eq(receivable.tenantId, tenantId), ...scopeConds(scope, { licensee: receivable.licenseeId, contract: receivable.contractId })))
    .groupBy(licensee.legalName)
    .orderBy(sql`sum(${receivable.amount}) desc`);
  return rows.map((r) => ({ label: r.label ?? "—", value: Number(r.value) }));
}
