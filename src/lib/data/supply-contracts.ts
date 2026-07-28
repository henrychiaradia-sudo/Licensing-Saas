import "server-only";
import { and, eq, desc, sql, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { supplyContract, supplier, category } from "@/lib/db/schema";
import type { SupplyContractStatus } from "@/lib/db/schema";

export async function listSupplyContracts(
  tenantId: string,
  opts?: { status?: SupplyContractStatus; q?: string },
) {
  const conds = [eq(supplyContract.tenantId, tenantId)];
  if (opts?.status) conds.push(eq(supplyContract.status, opts.status));
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const m = or(ilike(supplyContract.contractNumber, term), ilike(supplyContract.title, term));
    if (m) conds.push(m);
  }
  return db
    .select({
      id: supplyContract.id,
      contractNumber: supplyContract.contractNumber,
      title: supplyContract.title,
      status: supplyContract.status,
      currency: supplyContract.currency,
      totalValue: supplyContract.totalValue,
      startDate: supplyContract.startDate,
      endDate: supplyContract.endDate,
      autoRenew: supplyContract.autoRenew,
      supplierName: supplier.legalName,
    })
    .from(supplyContract)
    .leftJoin(supplier, eq(supplier.id, supplyContract.supplierId))
    .where(and(...conds))
    .orderBy(desc(supplyContract.createdAt))
    .limit(300);
}

export async function supplyContractSummary(tenantId: string) {
  const today = new Date();
  const in90 = new Date(today.getTime() + 90 * 86400000).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  const r = await db
    .select({
      active: sql<string>`count(*) filter (where ${supplyContract.status} in ('vigente','renovado'))`,
      totalValue: sql<string>`coalesce(sum(${supplyContract.totalValue}) filter (where ${supplyContract.status} in ('vigente','renovado')), 0)`,
      expiring: sql<string>`count(*) filter (where ${supplyContract.status} in ('vigente','renovado') and ${supplyContract.endDate} is not null and ${supplyContract.endDate} between ${todayStr} and ${in90})`,
      total: sql<string>`count(*)`,
    })
    .from(supplyContract)
    .where(eq(supplyContract.tenantId, tenantId));
  return {
    active: Number(r[0]?.active ?? 0),
    totalValue: r[0]?.totalValue ?? "0",
    expiring: Number(r[0]?.expiring ?? 0),
    total: Number(r[0]?.total ?? 0),
  };
}

export async function getSupplyContractDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: supplyContract.id,
      contractNumber: supplyContract.contractNumber,
      title: supplyContract.title,
      status: supplyContract.status,
      currency: supplyContract.currency,
      totalValue: supplyContract.totalValue,
      sla: supplyContract.sla,
      paymentTerms: supplyContract.paymentTerms,
      startDate: supplyContract.startDate,
      endDate: supplyContract.endDate,
      autoRenew: supplyContract.autoRenew,
      notes: supplyContract.notes,
      supplierName: supplier.legalName,
      supplierCode: supplier.code,
      categoryName: category.name,
    })
    .from(supplyContract)
    .leftJoin(supplier, eq(supplier.id, supplyContract.supplierId))
    .leftJoin(category, eq(category.id, supplyContract.categoryId))
    .where(and(eq(supplyContract.id, id), eq(supplyContract.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

export type SupplyContractInput = {
  title: string;
  supplierId: string;
  status: SupplyContractStatus;
  categoryId: string | null;
  currency: string;
  totalValue: number;
  sla: string | null;
  paymentTerms: string | null;
  startDate: string | null;
  endDate: string | null;
  autoRenew: boolean;
  notes: string | null;
};

export async function createSupplyContract(
  tenantId: string,
  input: SupplyContractInput,
  userId: string,
): Promise<{ id: string }> {
  const cnt = await db
    .select({ c: sql<string>`count(*)` })
    .from(supplyContract)
    .where(eq(supplyContract.tenantId, tenantId));
  const year = new Date().toISOString().slice(0, 4);
  const contractNumber = `CF-${year}-${String(Number(cnt[0]?.c ?? 0) + 1).padStart(4, "0")}`;
  const inserted = await db
    .insert(supplyContract)
    .values({
      tenantId,
      contractNumber,
      title: input.title,
      supplierId: input.supplierId,
      status: input.status,
      categoryId: input.categoryId,
      currency: input.currency,
      totalValue: input.totalValue.toFixed(2),
      sla: input.sla,
      paymentTerms: input.paymentTerms,
      startDate: input.startDate,
      endDate: input.endDate,
      autoRenew: input.autoRenew,
      notes: input.notes,
      createdBy: userId,
    })
    .returning({ id: supplyContract.id });
  return { id: inserted[0].id };
}

const SUPPLY_STATUS_VALUES = ["rascunho", "vigente", "suspenso", "encerrado", "renovado"] as const;

export async function setSupplyContractStatus(
  tenantId: string,
  id: string,
  status: SupplyContractStatus,
): Promise<void> {
  if (!(SUPPLY_STATUS_VALUES as readonly string[]).includes(status)) return;
  await db
    .update(supplyContract)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(supplyContract.id, id), eq(supplyContract.tenantId, tenantId)));
}
