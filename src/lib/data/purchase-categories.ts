import "server-only";
import { and, eq, desc, asc, sql, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { purchaseCategory, purchaseOrder, supplier } from "@/lib/db/schema";
import type { SpendNature, PurchaseCategoryStatus } from "@/lib/db/schema";

/** Gasto realizado por categoria = soma dos pedidos (exceto cancelados). */
const spentExpr = (catId = purchaseCategory.id) => sql<string>`(
  select coalesce(sum(po.total_amount), 0) from purchase_order po
  where po.purchase_category_id = ${catId} and po.status <> 'cancelado'
)`;
const poCountExpr = sql<string>`(
  select count(*) from purchase_order po where po.purchase_category_id = ${purchaseCategory.id}
)`;
const supplierCountExpr = sql<string>`(
  select count(distinct po.supplier_id) from purchase_order po
  where po.purchase_category_id = ${purchaseCategory.id}
)`;

export async function listPurchaseCategories(
  tenantId: string,
  opts?: { nature?: SpendNature; q?: string; status?: PurchaseCategoryStatus },
) {
  const conds = [eq(purchaseCategory.tenantId, tenantId)];
  if (opts?.nature) conds.push(eq(purchaseCategory.nature, opts.nature));
  if (opts?.status) conds.push(eq(purchaseCategory.status, opts.status));
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const m = or(ilike(purchaseCategory.name, term), ilike(purchaseCategory.code, term));
    if (m) conds.push(m);
  }
  return db
    .select({
      id: purchaseCategory.id,
      code: purchaseCategory.code,
      name: purchaseCategory.name,
      nature: purchaseCategory.nature,
      ownerName: purchaseCategory.ownerName,
      annualBudget: purchaseCategory.annualBudget,
      status: purchaseCategory.status,
      spent: spentExpr(),
      poCount: poCountExpr,
      supplierCount: supplierCountExpr,
    })
    .from(purchaseCategory)
    .where(and(...conds))
    .orderBy(desc(sql`(${spentExpr()})`), asc(purchaseCategory.name))
    .limit(200);
}

export async function categoriesSummary(tenantId: string) {
  const totalSpent = sql<string>`(
    select coalesce(sum(po.total_amount), 0) from purchase_order po
    where po.tenant_id = ${tenantId} and po.purchase_category_id is not null and po.status <> 'cancelado'
  )`;
  const r = await db
    .select({
      total: sql<string>`count(*)`,
      active: sql<string>`count(*) filter (where ${purchaseCategory.status} = 'ativa')`,
      budget: sql<string>`coalesce(sum(${purchaseCategory.annualBudget}), 0)`,
      spent: totalSpent,
    })
    .from(purchaseCategory)
    .where(eq(purchaseCategory.tenantId, tenantId));
  const budget = Number(r[0]?.budget ?? 0);
  const spent = Number(r[0]?.spent ?? 0);
  return {
    total: Number(r[0]?.total ?? 0),
    active: Number(r[0]?.active ?? 0),
    budget,
    spent,
    usage: budget > 0 ? Math.round((spent / budget) * 100) : 0,
    available: budget - spent,
  };
}

export type Slice = { key: string; label: string; value: number };

export async function spendByCategory(tenantId: string): Promise<Slice[]> {
  const rows = await db
    .select({ id: purchaseCategory.id, name: purchaseCategory.name, spent: spentExpr() })
    .from(purchaseCategory)
    .where(eq(purchaseCategory.tenantId, tenantId));
  return rows
    .map((r) => ({ key: r.id, label: r.name, value: Number(r.spent) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

const NATURE_LABEL: Record<SpendNature, string> = { capex: "Capex", opex: "Opex", mro: "MRO" };

export async function spendByNature(tenantId: string): Promise<Slice[]> {
  const rows = await db
    .select({ nature: purchaseCategory.nature, spent: spentExpr() })
    .from(purchaseCategory)
    .where(eq(purchaseCategory.tenantId, tenantId));
  const acc: Record<string, number> = { capex: 0, opex: 0, mro: 0 };
  for (const r of rows) acc[r.nature] = (acc[r.nature] ?? 0) + Number(r.spent);
  return (["capex", "opex", "mro"] as SpendNature[])
    .map((k) => ({ key: k, label: NATURE_LABEL[k], value: acc[k] ?? 0 }))
    .filter((r) => r.value > 0);
}

export async function getPurchaseCategoryDetail(tenantId: string, id: string) {
  const rows = await db
    .select()
    .from(purchaseCategory)
    .where(and(eq(purchaseCategory.id, id), eq(purchaseCategory.tenantId, tenantId)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;

  const pos = await db
    .select({
      id: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      status: purchaseOrder.status,
      totalAmount: purchaseOrder.totalAmount,
      orderDate: purchaseOrder.orderDate,
      supplierName: supplier.legalName,
    })
    .from(purchaseOrder)
    .leftJoin(supplier, eq(supplier.id, purchaseOrder.supplierId))
    .where(and(eq(purchaseOrder.purchaseCategoryId, id), eq(purchaseOrder.tenantId, tenantId)))
    .orderBy(desc(purchaseOrder.orderDate));

  const spent = pos
    .filter((p) => p.status !== "cancelado")
    .reduce((s, p) => s + Number(p.totalAmount), 0);
  const budget = Number(head.annualBudget);

  return {
    category: head,
    pos,
    rollup: {
      budget,
      spent,
      usage: budget > 0 ? Math.round((spent / budget) * 100) : 0,
      available: budget - spent,
      poCount: pos.length,
      supplierCount: new Set(pos.map((p) => p.supplierName).filter(Boolean)).size,
    },
  };
}

export type PurchaseCategoryInput = {
  code: string;
  name: string;
  nature: SpendNature;
  ownerName: string | null;
  annualBudget: number;
  strategy: string | null;
  status: PurchaseCategoryStatus;
  notes: string | null;
};

export async function createPurchaseCategory(
  tenantId: string,
  input: PurchaseCategoryInput,
  userId: string,
) {
  const inserted = await db
    .insert(purchaseCategory)
    .values({
      tenantId,
      code: input.code,
      name: input.name,
      nature: input.nature,
      ownerName: input.ownerName,
      annualBudget: input.annualBudget.toFixed(2),
      strategy: input.strategy,
      status: input.status,
      notes: input.notes,
      createdBy: userId,
    })
    .returning({ id: purchaseCategory.id });
  return { id: inserted[0].id };
}

export async function updatePurchaseCategory(
  tenantId: string,
  id: string,
  input: PurchaseCategoryInput,
) {
  await db
    .update(purchaseCategory)
    .set({
      code: input.code,
      name: input.name,
      nature: input.nature,
      ownerName: input.ownerName,
      annualBudget: input.annualBudget.toFixed(2),
      strategy: input.strategy,
      status: input.status,
      notes: input.notes,
      updatedAt: new Date(),
    })
    .where(and(eq(purchaseCategory.id, id), eq(purchaseCategory.tenantId, tenantId)));
}

export async function listPurchaseCategoryOptions(tenantId: string) {
  return db
    .select({ id: purchaseCategory.id, code: purchaseCategory.code, name: purchaseCategory.name })
    .from(purchaseCategory)
    .where(eq(purchaseCategory.tenantId, tenantId))
    .orderBy(asc(purchaseCategory.name));
}
