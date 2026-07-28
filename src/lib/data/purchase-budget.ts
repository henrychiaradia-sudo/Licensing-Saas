import "server-only";
import { and, eq, asc, sql, isNotNull, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { purchaseBudget, purchaseCategory, purchaseOrder } from "@/lib/db/schema";

export const CURRENT_FISCAL_YEAR = 2026;

type PoAgg = { committed: number; realized: number; poCount: number };

/** Agrega pedidos por categoria no ano fiscal: empenhado (em aberto) e realizado (recebido). */
async function poAggByCategoryYear(
  tenantId: string,
  fiscalYear: number,
): Promise<Map<string, PoAgg>> {
  const rows = await db
    .select({
      catId: purchaseOrder.purchaseCategoryId,
      committed: sql<string>`coalesce(sum(${purchaseOrder.totalAmount}) filter (where ${purchaseOrder.status} in ('enviado','confirmado','em_producao','embarcado')), 0)`,
      realized: sql<string>`coalesce(sum(${purchaseOrder.totalAmount}) filter (where ${purchaseOrder.status} = 'recebido'), 0)`,
      poCount: sql<string>`count(*) filter (where ${purchaseOrder.status} <> 'cancelado')`,
    })
    .from(purchaseOrder)
    .where(
      and(
        eq(purchaseOrder.tenantId, tenantId),
        isNotNull(purchaseOrder.purchaseCategoryId),
        gte(purchaseOrder.orderDate, `${fiscalYear}-01-01`),
        lte(purchaseOrder.orderDate, `${fiscalYear}-12-31`),
      ),
    )
    .groupBy(purchaseOrder.purchaseCategoryId);
  const m = new Map<string, PoAgg>();
  for (const r of rows) {
    if (r.catId)
      m.set(r.catId, {
        committed: Number(r.committed),
        realized: Number(r.realized),
        poCount: Number(r.poCount),
      });
  }
  return m;
}

export type BudgetRow = {
  categoryId: string;
  code: string;
  name: string;
  nature: string;
  budget: number;
  committed: number;
  realized: number;
  consumed: number;
  available: number;
  utilizationPct: number;
  over: boolean;
};

export async function listBudgets(tenantId: string, fiscalYear: number): Promise<BudgetRow[]> {
  const [cats, budgets, agg] = await Promise.all([
    db
      .select({
        id: purchaseCategory.id,
        code: purchaseCategory.code,
        name: purchaseCategory.name,
        nature: purchaseCategory.nature,
      })
      .from(purchaseCategory)
      .where(eq(purchaseCategory.tenantId, tenantId))
      .orderBy(asc(purchaseCategory.name)),
    db
      .select({
        categoryId: purchaseBudget.purchaseCategoryId,
        amount: purchaseBudget.amount,
      })
      .from(purchaseBudget)
      .where(
        and(eq(purchaseBudget.tenantId, tenantId), eq(purchaseBudget.fiscalYear, fiscalYear)),
      ),
    poAggByCategoryYear(tenantId, fiscalYear),
  ]);

  const budgetByCat = new Map(budgets.map((b) => [b.categoryId, Number(b.amount)]));

  return cats
    .map((c) => {
      const budget = budgetByCat.get(c.id) ?? 0;
      const a = agg.get(c.id) ?? { committed: 0, realized: 0, poCount: 0 };
      const consumed = a.committed + a.realized;
      const available = budget - consumed;
      return {
        categoryId: c.id,
        code: c.code,
        name: c.name,
        nature: c.nature,
        budget,
        committed: a.committed,
        realized: a.realized,
        consumed,
        available,
        utilizationPct: budget > 0 ? Math.round((consumed / budget) * 100) : consumed > 0 ? 999 : 0,
        over: consumed > budget && (budget > 0 || consumed > 0),
      };
    })
    .sort((x, y) => y.consumed - x.consumed);
}

export async function budgetKpis(tenantId: string, fiscalYear: number) {
  const rows = await listBudgets(tenantId, fiscalYear);
  const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
  const totalCommitted = rows.reduce((s, r) => s + r.committed, 0);
  const totalRealized = rows.reduce((s, r) => s + r.realized, 0);
  const totalConsumed = totalCommitted + totalRealized;
  return {
    totalBudget,
    totalCommitted,
    totalRealized,
    totalConsumed,
    totalAvailable: totalBudget - totalConsumed,
    utilizationPct: totalBudget > 0 ? Math.round((totalConsumed / totalBudget) * 100) : 0,
    overCount: rows.filter((r) => r.over).length,
    withBudget: rows.filter((r) => r.budget > 0).length,
  };
}

export async function listBudgetCategoryOptions(tenantId: string) {
  return db
    .select({ id: purchaseCategory.id, code: purchaseCategory.code, name: purchaseCategory.name })
    .from(purchaseCategory)
    .where(eq(purchaseCategory.tenantId, tenantId))
    .orderBy(asc(purchaseCategory.name));
}

export type BudgetInput = {
  purchaseCategoryId: string;
  fiscalYear: number;
  amount: number;
  notes: string | null;
};

/** Cria ou atualiza (upsert) o orçamento de uma categoria no ano fiscal. */
export async function upsertBudget(tenantId: string, input: BudgetInput, userId: string) {
  const existing = await db
    .select({ id: purchaseBudget.id })
    .from(purchaseBudget)
    .where(
      and(
        eq(purchaseBudget.tenantId, tenantId),
        eq(purchaseBudget.purchaseCategoryId, input.purchaseCategoryId),
        eq(purchaseBudget.fiscalYear, input.fiscalYear),
      ),
    )
    .limit(1);
  if (existing[0]) {
    await db
      .update(purchaseBudget)
      .set({ amount: input.amount.toFixed(2), notes: input.notes })
      .where(eq(purchaseBudget.id, existing[0].id));
  } else {
    await db.insert(purchaseBudget).values({
      tenantId,
      purchaseCategoryId: input.purchaseCategoryId,
      fiscalYear: input.fiscalYear,
      amount: input.amount.toFixed(2),
      notes: input.notes,
      createdBy: userId,
    });
  }
}
