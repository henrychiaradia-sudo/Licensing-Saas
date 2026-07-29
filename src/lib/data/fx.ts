import "server-only";
import { and, eq, asc, desc, inArray, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { currency, fxRate, hedgeContract, purchaseOrder, supplier } from "@/lib/db/schema";
import type { HedgeInstrument, HedgeSide, HedgeStatus } from "@/lib/db/schema";
import { fetchLiveQuotes } from "@/lib/fx-live";

/** Moeda base do sistema. Todas as taxas são expressas em BRL por 1 unidade. */
export const BASE_ISO = "BRL";

/** Status de pedido que representam compromisso cambial em aberto (exposição). */
export const OPEN_PO_STATUS = ["enviado", "confirmado", "em_producao", "embarcado"] as const;

export function convertToBase(amountNative: number, rateToBase: number): number {
  return amountNative * rateToBase;
}

/* ---------------------------------------------------------------------------
 * Moedas + taxas (atual, anterior, histórico)
 * ------------------------------------------------------------------------- */

export type CurrencyRate = {
  id: string;
  isoCode: string;
  name: string;
  symbol: string | null;
  isBase: boolean;
  current: number | null;
  previous: number | null;
  changePct: number | null;
  rateDate: string | null;
  history: { date: string; rate: number }[];
};

export async function listCurrencyRates(tenantId: string): Promise<CurrencyRate[]> {
  const [curs, rates] = await Promise.all([
    db
      .select({
        id: currency.id,
        isoCode: currency.isoCode,
        name: currency.name,
        symbol: currency.symbol,
      })
      .from(currency)
      .where(eq(currency.active, true))
      .orderBy(asc(currency.isoCode)),
    db
      .select({
        currencyId: fxRate.currencyId,
        rate: fxRate.rateToBase,
        rateDate: fxRate.rateDate,
      })
      .from(fxRate)
      .where(eq(fxRate.tenantId, tenantId))
      .orderBy(desc(fxRate.rateDate)),
  ]);

  const byCur = new Map<string, { date: string; rate: number }[]>();
  for (const r of rates) {
    const arr = byCur.get(r.currencyId) ?? [];
    arr.push({ date: r.rateDate as unknown as string, rate: Number(r.rate) });
    byCur.set(r.currencyId, arr);
  }

  return curs.map((c) => {
    const isBase = c.isoCode.trim() === BASE_ISO;
    const series = byCur.get(c.id) ?? []; // desc (mais recente primeiro)
    const current = isBase ? 1 : series[0]?.rate ?? null;
    const previous = isBase ? 1 : series[1]?.rate ?? null;
    const changePct =
      current != null && previous != null && previous !== 0
        ? ((current - previous) / previous) * 100
        : null;
    const history = [...series].reverse().slice(-10); // asc para sparkline
    return {
      id: c.id,
      isoCode: c.isoCode.trim(),
      name: c.name,
      symbol: c.symbol,
      isBase,
      current,
      previous,
      changePct,
      rateDate: isBase ? null : (series[0]?.date ?? null),
      history,
    };
  });
}

/** Map moeda→taxa atual (BRL por unidade). BRL = 1. */
export async function currentRateMap(tenantId: string): Promise<Map<string, number>> {
  const list = await listCurrencyRates(tenantId);
  const m = new Map<string, number>();
  for (const c of list) if (c.current != null) m.set(c.id, c.current);
  return m;
}

/* ---------------------------------------------------------------------------
 * Exposição cambial (compromissos em aberto por moeda, convertidos a BRL)
 * ------------------------------------------------------------------------- */

export type ExposureRow = {
  currencyId: string;
  isoCode: string;
  name: string;
  symbol: string | null;
  rate: number;
  exposureNative: number;
  exposureBase: number;
  hedgedNative: number;
  hedgedBase: number;
  unhedgedNative: number;
  netBase: number;
  coveragePct: number;
  poCount: number;
};

export type OpenPo = {
  id: string;
  poNumber: string;
  supplierName: string | null;
  isoCode: string;
  status: string;
  amountNative: number;
  amountBase: number;
};

export async function fxExposure(tenantId: string): Promise<{
  rows: ExposureRow[];
  openPos: OpenPo[];
  totals: {
    exposureBase: number;
    hedgedBase: number;
    netBase: number;
    coveragePct: number;
    currencyCount: number;
    poCount: number;
    hedgeCount: number;
  };
}> {
  const [curList, pos, hedges] = await Promise.all([
    listCurrencyRates(tenantId),
    db
      .select({
        id: purchaseOrder.id,
        poNumber: purchaseOrder.poNumber,
        currencyId: purchaseOrder.currencyId,
        totalAmount: purchaseOrder.totalAmount,
        status: purchaseOrder.status,
        supplierName: supplier.legalName,
      })
      .from(purchaseOrder)
      .leftJoin(supplier, eq(supplier.id, purchaseOrder.supplierId))
      .where(
        and(
          eq(purchaseOrder.tenantId, tenantId),
          inArray(purchaseOrder.status, [...OPEN_PO_STATUS]),
        ),
      ),
    db
      .select({
        currencyId: hedgeContract.currencyId,
        notional: hedgeContract.notional,
        strikeRate: hedgeContract.strikeRate,
      })
      .from(hedgeContract)
      .where(and(eq(hedgeContract.tenantId, tenantId), eq(hedgeContract.status, "ativo"))),
  ]);

  const curById = new Map(curList.map((c) => [c.id, c]));
  const baseId = curList.find((c) => c.isBase)?.id ?? null;

  // Agrega exposição por moeda (somente moeda estrangeira = risco cambial)
  const agg = new Map<string, { native: number; poCount: number }>();
  const openPos: OpenPo[] = [];
  for (const p of pos) {
    const c = curById.get(p.currencyId);
    const rate = c?.current ?? 1;
    const native = Number(p.totalAmount);
    openPos.push({
      id: p.id,
      poNumber: p.poNumber,
      supplierName: p.supplierName,
      isoCode: c?.isoCode ?? "?",
      status: p.status,
      amountNative: native,
      amountBase: native * rate,
    });
    if (p.currencyId === baseId) continue; // BRL não gera risco cambial
    const a = agg.get(p.currencyId) ?? { native: 0, poCount: 0 };
    a.native += native;
    a.poCount += 1;
    agg.set(p.currencyId, a);
  }

  // Hedge ativo por moeda
  const hedgeByCur = new Map<string, { native: number; base: number }>();
  for (const h of hedges) {
    if (h.currencyId === baseId) continue;
    const notional = Number(h.notional);
    const strike = Number(h.strikeRate);
    const cur = hedgeByCur.get(h.currencyId) ?? { native: 0, base: 0 };
    cur.native += notional;
    cur.base += notional * strike;
    hedgeByCur.set(h.currencyId, cur);
  }

  const rows: ExposureRow[] = [];
  for (const [curId, a] of agg) {
    const c = curById.get(curId);
    if (!c || c.current == null) continue;
    const rate = c.current;
    const exposureBase = a.native * rate;
    const h = hedgeByCur.get(curId) ?? { native: 0, base: 0 };
    const hedgedNative = Math.min(h.native, a.native); // cobertura não excede exposição
    const hedgedBase = hedgedNative * rate;
    const unhedgedNative = Math.max(0, a.native - hedgedNative);
    const netBase = unhedgedNative * rate;
    rows.push({
      currencyId: curId,
      isoCode: c.isoCode,
      name: c.name,
      symbol: c.symbol,
      rate,
      exposureNative: a.native,
      exposureBase,
      hedgedNative,
      hedgedBase,
      unhedgedNative,
      netBase,
      coveragePct: a.native > 0 ? Math.round((hedgedNative / a.native) * 100) : 0,
      poCount: a.poCount,
    });
  }
  rows.sort((x, y) => y.exposureBase - x.exposureBase);
  openPos.sort((x, y) => y.amountBase - x.amountBase);

  const exposureBase = rows.reduce((s, r) => s + r.exposureBase, 0);
  const hedgedBase = rows.reduce((s, r) => s + r.hedgedBase, 0);
  const netBase = rows.reduce((s, r) => s + r.netBase, 0);

  return {
    rows,
    openPos,
    totals: {
      exposureBase,
      hedgedBase,
      netBase,
      coveragePct: exposureBase > 0 ? Math.round((hedgedBase / exposureBase) * 100) : 0,
      currencyCount: rows.length,
      poCount: rows.reduce((s, r) => s + r.poCount, 0),
      hedgeCount: hedges.length,
    },
  };
}

/* ---------------------------------------------------------------------------
 * Hedge (NDF/forward/swap/opção)
 * ------------------------------------------------------------------------- */

export async function listHedges(tenantId: string) {
  const rows = await db
    .select({
      id: hedgeContract.id,
      contractNumber: hedgeContract.contractNumber,
      instrument: hedgeContract.instrument,
      side: hedgeContract.side,
      notional: hedgeContract.notional,
      strikeRate: hedgeContract.strikeRate,
      tradeDate: hedgeContract.tradeDate,
      maturityDate: hedgeContract.maturityDate,
      counterparty: hedgeContract.counterparty,
      status: hedgeContract.status,
      isoCode: currency.isoCode,
    })
    .from(hedgeContract)
    .leftJoin(currency, eq(currency.id, hedgeContract.currencyId))
    .where(eq(hedgeContract.tenantId, tenantId))
    .orderBy(desc(hedgeContract.maturityDate));
  return rows.map((h) => ({
    ...h,
    isoCode: h.isoCode?.trim() ?? "?",
    notionalNum: Number(h.notional),
    strikeNum: Number(h.strikeRate),
    coveredBase: Number(h.notional) * Number(h.strikeRate),
  }));
}

export type FxRateInput = {
  currencyId: string;
  rateToBase: number;
  rateDate: string;
  source: string | null;
};

export async function addFxRate(tenantId: string, input: FxRateInput, userId: string) {
  const cur = await db
    .select({ id: currency.id, iso: currency.isoCode })
    .from(currency)
    .where(eq(currency.id, input.currencyId))
    .limit(1);
  if (!cur[0]) throw new Error("Moeda inválida.");
  if (cur[0].iso.trim() === BASE_ISO) throw new Error("A moeda base (BRL) não recebe cotação.");
  await db.insert(fxRate).values({
    tenantId,
    currencyId: input.currencyId,
    rateToBase: input.rateToBase.toFixed(6),
    rateDate: input.rateDate,
    source: input.source,
    createdBy: userId,
  });
}

export type HedgeInput = {
  currencyId: string;
  instrument: HedgeInstrument;
  side: HedgeSide;
  notional: number;
  strikeRate: number;
  tradeDate: string;
  maturityDate: string;
  counterparty: string | null;
  notes: string | null;
};

export async function addHedge(tenantId: string, input: HedgeInput, userId: string) {
  const cur = await db
    .select({ id: currency.id, iso: currency.isoCode })
    .from(currency)
    .where(eq(currency.id, input.currencyId))
    .limit(1);
  if (!cur[0]) throw new Error("Moeda inválida.");
  if (cur[0].iso.trim() === BASE_ISO) throw new Error("Não há hedge para a moeda base (BRL).");

  const cnt = await db
    .select({ c: count() })
    .from(hedgeContract)
    .where(eq(hedgeContract.tenantId, tenantId));
  const year = new Date().getFullYear();
  const contractNumber = `HDG-${year}-${String((cnt[0]?.c ?? 0) + 1).padStart(4, "0")}`;

  await db.insert(hedgeContract).values({
    tenantId,
    contractNumber,
    currencyId: input.currencyId,
    instrument: input.instrument,
    side: input.side,
    notional: input.notional.toFixed(2),
    strikeRate: input.strikeRate.toFixed(6),
    tradeDate: input.tradeDate,
    maturityDate: input.maturityDate,
    counterparty: input.counterparty,
    notes: input.notes,
    createdBy: userId,
  });
  return { contractNumber };
}

export async function setHedgeStatus(tenantId: string, id: string, status: HedgeStatus) {
  await db
    .update(hedgeContract)
    .set({ status })
    .where(and(eq(hedgeContract.id, id), eq(hedgeContract.tenantId, tenantId)));
}

export function currencyOptionsFrom(rates: CurrencyRate[]) {
  return rates
    .filter((c) => !c.isBase)
    .map((c) => ({ id: c.id, label: `${c.isoCode} — ${c.name}` }));
}

/* ---------------------------------------------------------------------------
 * Sincronização automática: grava a cotação comercial ao vivo (AwesomeAPI)
 * na tabela fx_rate das moedas ativas correspondentes (uma por dia).
 * ------------------------------------------------------------------------- */
export async function syncLiveRates(
  tenantId: string,
  userId: string,
): Promise<{ updated: number; missing: string[] }> {
  const quotes = await fetchLiveQuotes();
  if (!quotes.ok) throw new Error("Não foi possível obter as cotações em tempo real agora.");

  const byIso = new Map(quotes.comercial.map((q) => [q.code, q]));
  const curs = await db
    .select({ id: currency.id, iso: currency.isoCode })
    .from(currency)
    .where(eq(currency.active, true));

  const today = new Date().toISOString().slice(0, 10);
  let updated = 0;
  const missing: string[] = [];

  for (const c of curs) {
    const iso = c.iso.trim();
    if (iso === BASE_ISO) continue;
    const quote = byIso.get(iso);
    if (!quote) {
      missing.push(iso);
      continue;
    }
    const rate = quote.ask > 0 ? quote.ask : quote.bid; // venda como referência
    if (!(rate > 0)) continue;
    // Mantém uma cotação por dia por moeda (evita duplicar em syncs repetidos).
    await db
      .delete(fxRate)
      .where(and(eq(fxRate.tenantId, tenantId), eq(fxRate.currencyId, c.id), eq(fxRate.rateDate, today)));
    await db.insert(fxRate).values({
      tenantId,
      currencyId: c.id,
      rateToBase: rate.toFixed(6),
      rateDate: today,
      source: "AwesomeAPI (comercial)",
      createdBy: userId,
    });
    updated++;
  }
  return { updated, missing };
}
