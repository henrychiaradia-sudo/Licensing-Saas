import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { royaltyReport, receivable, purchaseOrder, supplier, licensee } from "@/lib/db/schema";

export type Slice = { label: string; value: number };

export async function royaltiesByCompetencia(tenantId: string): Promise<Slice[]> {
  const rows = await db
    .select({
      label: royaltyReport.referenceLabel,
      value: sql<string>`sum(${royaltyReport.royaltyCalculated})`,
    })
    .from(royaltyReport)
    .where(eq(royaltyReport.tenantId, tenantId))
    .groupBy(royaltyReport.referenceLabel)
    .orderBy(royaltyReport.referenceLabel);
  return rows.map((r) => ({ label: r.label, value: Number(r.value) }));
}

export async function purchasesBySupplier(tenantId: string): Promise<Slice[]> {
  const rows = await db
    .select({
      label: supplier.legalName,
      value: sql<string>`sum(${purchaseOrder.totalAmount})`,
    })
    .from(purchaseOrder)
    .leftJoin(supplier, eq(supplier.id, purchaseOrder.supplierId))
    .where(and(eq(purchaseOrder.tenantId, tenantId), sql`${purchaseOrder.status} <> 'cancelado'`))
    .groupBy(supplier.legalName)
    .orderBy(sql`sum(${purchaseOrder.totalAmount}) desc`);
  return rows.map((r) => ({ label: r.label ?? "—", value: Number(r.value) }));
}

export async function receivablesByStatus(tenantId: string): Promise<Slice[]> {
  const rows = await db
    .select({
      label: receivable.status,
      value: sql<string>`sum(${receivable.amount})`,
    })
    .from(receivable)
    .where(eq(receivable.tenantId, tenantId))
    .groupBy(receivable.status)
    .orderBy(sql`sum(${receivable.amount}) desc`);
  return rows.map((r) => ({ label: r.label, value: Number(r.value) }));
}

export async function revenueByLicensee(tenantId: string): Promise<Slice[]> {
  const rows = await db
    .select({
      label: licensee.legalName,
      value: sql<string>`sum(${receivable.amount})`,
    })
    .from(receivable)
    .leftJoin(licensee, eq(licensee.id, receivable.licenseeId))
    .where(eq(receivable.tenantId, tenantId))
    .groupBy(licensee.legalName)
    .orderBy(sql`sum(${receivable.amount}) desc`);
  return rows.map((r) => ({ label: r.label ?? "—", value: Number(r.value) }));
}
