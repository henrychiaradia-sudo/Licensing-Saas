import "server-only";
import { and, eq, desc, asc, sql, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { costSheet, product, supplier } from "@/lib/db/schema";
import { computeCost, type CostInput, type CostResult } from "@/lib/costing";

/** Converte uma linha do banco (numeric = string) para entrada do motor de custo. */
function rowToInput(r: Record<string, unknown>): CostInput {
  const num = (k: string) => Number(r[k] ?? 0);
  return {
    fob: num("fob"),
    freightIntl: num("freightIntl"),
    insurance: num("insurance"),
    ii: num("ii"),
    ipiImport: num("ipiImport"),
    icms: num("icms"),
    pis: num("pis"),
    cofins: num("cofins"),
    iss: num("iss"),
    ipi: num("ipi"),
    armazenagem: num("armazenagem"),
    desembaraco: num("desembaraco"),
    comissao: num("comissao"),
    royalties: num("royalties"),
    marketing: num("marketing"),
    trade: num("trade"),
    logistica: num("logistica"),
    custoIndustrial: num("custoIndustrial"),
    markupPct: num("markupPct"),
  };
}

export async function listCostSheets(tenantId: string, opts?: { q?: string }) {
  const conds = [eq(costSheet.tenantId, tenantId)];
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const m = or(ilike(costSheet.name, term), ilike(costSheet.code, term), ilike(costSheet.sku, term));
    if (m) conds.push(m);
  }
  const rows = await db
    .select({
      id: costSheet.id,
      code: costSheet.code,
      name: costSheet.name,
      sku: costSheet.sku,
      currency: costSheet.currency,
      productName: product.name,
      fob: costSheet.fob,
      freightIntl: costSheet.freightIntl,
      insurance: costSheet.insurance,
      ii: costSheet.ii,
      ipiImport: costSheet.ipiImport,
      icms: costSheet.icms,
      pis: costSheet.pis,
      cofins: costSheet.cofins,
      iss: costSheet.iss,
      ipi: costSheet.ipi,
      armazenagem: costSheet.armazenagem,
      desembaraco: costSheet.desembaraco,
      comissao: costSheet.comissao,
      royalties: costSheet.royalties,
      marketing: costSheet.marketing,
      trade: costSheet.trade,
      logistica: costSheet.logistica,
      custoIndustrial: costSheet.custoIndustrial,
      markupPct: costSheet.markupPct,
    })
    .from(costSheet)
    .leftJoin(product, eq(product.id, costSheet.productId))
    .where(and(...conds))
    .orderBy(desc(costSheet.createdAt))
    .limit(200);
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    sku: r.sku,
    currency: r.currency,
    productName: r.productName,
    result: computeCost(rowToInput(r)),
  }));
}

export async function costSheetsSummary(tenantId: string) {
  const rows = await db
    .select()
    .from(costSheet)
    .where(eq(costSheet.tenantId, tenantId));
  const results = rows.map((r) => computeCost(rowToInput(r as unknown as Record<string, unknown>)));
  const total = results.length;
  const avgMargin =
    total > 0 ? results.reduce((s, r) => s + r.margemPct, 0) / total : 0;
  const avgPrice = total > 0 ? results.reduce((s, r) => s + r.precoSugerido, 0) / total : 0;
  const avgCost = total > 0 ? results.reduce((s, r) => s + r.custoTotal, 0) / total : 0;
  return { total, avgMargin, avgPrice, avgCost };
}

export async function getCostSheetDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      sheet: costSheet,
      productName: product.name,
      supplierName: supplier.legalName,
    })
    .from(costSheet)
    .leftJoin(product, eq(product.id, costSheet.productId))
    .leftJoin(supplier, eq(supplier.id, costSheet.supplierId))
    .where(and(eq(costSheet.id, id), eq(costSheet.tenantId, tenantId)))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  const result = computeCost(rowToInput(row.sheet as unknown as Record<string, unknown>));
  return { sheet: row.sheet, productName: row.productName, supplierName: row.supplierName, result };
}

export type CostSheetInput = CostInput & {
  name: string;
  productId: string | null;
  supplierId: string | null;
  sku: string | null;
  currency: string;
  notes: string | null;
};

function toValues(input: CostSheetInput) {
  const f = (v: number) => v.toFixed(4);
  return {
    name: input.name,
    productId: input.productId,
    supplierId: input.supplierId,
    sku: input.sku,
    currency: input.currency,
    fob: f(input.fob),
    freightIntl: f(input.freightIntl),
    insurance: f(input.insurance),
    ii: f(input.ii),
    ipiImport: f(input.ipiImport),
    icms: f(input.icms),
    pis: f(input.pis),
    cofins: f(input.cofins),
    iss: f(input.iss),
    ipi: f(input.ipi),
    armazenagem: f(input.armazenagem),
    desembaraco: f(input.desembaraco),
    comissao: f(input.comissao),
    royalties: f(input.royalties),
    marketing: f(input.marketing),
    trade: f(input.trade),
    logistica: f(input.logistica),
    custoIndustrial: f(input.custoIndustrial),
    markupPct: f(input.markupPct),
    notes: input.notes,
  };
}

export async function createCostSheet(tenantId: string, input: CostSheetInput, userId: string) {
  const cnt = await db
    .select({ c: sql<string>`count(*)` })
    .from(costSheet)
    .where(eq(costSheet.tenantId, tenantId));
  const year = new Date().getFullYear();
  const code = `CST-${year}-${String(Number(cnt[0]?.c ?? 0) + 1).padStart(4, "0")}`;
  const inserted = await db
    .insert(costSheet)
    .values({ tenantId, code, ...toValues(input), createdBy: userId })
    .returning({ id: costSheet.id });
  return { id: inserted[0].id };
}

export async function updateCostSheet(tenantId: string, id: string, input: CostSheetInput) {
  await db
    .update(costSheet)
    .set({ ...toValues(input), updatedAt: new Date() })
    .where(and(eq(costSheet.id, id), eq(costSheet.tenantId, tenantId)));
}

export type { CostResult };
