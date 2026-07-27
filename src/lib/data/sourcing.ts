import "server-only";
import { and, eq, desc, asc, inArray, count, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  sourcingEvent,
  sourcingQuote,
  negotiationRound,
  supplier,
  currency,
  category,
  purchaseOrder,
} from "@/lib/db/schema";
import type { SourcingStatus } from "@/lib/db/schema";
import { createPurchaseOrder } from "./purchase-orders";

export async function listSourcing(tenantId: string) {
  const events = await db
    .select({
      id: sourcingEvent.id,
      title: sourcingEvent.title,
      status: sourcingEvent.status,
      dueDate: sourcingEvent.dueDate,
    })
    .from(sourcingEvent)
    .where(eq(sourcingEvent.tenantId, tenantId))
    .orderBy(desc(sourcingEvent.createdAt))
    .limit(100);

  if (!events.length) return [];

  const ids = events.map((e) => e.id);
  const quotes = await db
    .select({
      id: sourcingQuote.id,
      sourcingEventId: sourcingQuote.sourcingEventId,
      amount: sourcingQuote.amount,
      leadTimeDays: sourcingQuote.leadTimeDays,
      score: sourcingQuote.score,
      isAwarded: sourcingQuote.isAwarded,
      notes: sourcingQuote.notes,
      currencyIso: currency.isoCode,
      supplierName: supplier.legalName,
    })
    .from(sourcingQuote)
    .leftJoin(supplier, eq(supplier.id, sourcingQuote.supplierId))
    .leftJoin(currency, eq(currency.id, sourcingQuote.currencyId))
    .where(inArray(sourcingQuote.sourcingEventId, ids))
    .orderBy(desc(sourcingQuote.score));

  return events.map((e) => ({
    ...e,
    quotes: quotes.filter((q) => q.sourcingEventId === e.id),
  }));
}

/* ---------------------------------------------------------------------------
 * Criação de evento (RFQ), cotações, adjudicação e geração de pedido
 * ------------------------------------------------------------------------- */

export async function listCategoryOptions(tenantId: string) {
  return db
    .select({ id: category.id, name: category.name })
    .from(category)
    .where(eq(category.tenantId, tenantId))
    .orderBy(asc(category.name));
}

export async function getSourcingEventDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: sourcingEvent.id,
      title: sourcingEvent.title,
      status: sourcingEvent.status,
      dueDate: sourcingEvent.dueDate,
      baselineAmount: sourcingEvent.baselineAmount,
      weightPrice: sourcingEvent.weightPrice,
      weightLead: sourcingEvent.weightLead,
      weightQuality: sourcingEvent.weightQuality,
      weightPayment: sourcingEvent.weightPayment,
      categoryName: category.name,
    })
    .from(sourcingEvent)
    .leftJoin(category, eq(category.id, sourcingEvent.categoryId))
    .where(and(eq(sourcingEvent.id, id), eq(sourcingEvent.tenantId, tenantId)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;

  const quotes = await db
    .select({
      id: sourcingQuote.id,
      supplierId: sourcingQuote.supplierId,
      amount: sourcingQuote.amount,
      leadTimeDays: sourcingQuote.leadTimeDays,
      score: sourcingQuote.score,
      freightCost: sourcingQuote.freightCost,
      taxCost: sourcingQuote.taxCost,
      otherCost: sourcingQuote.otherCost,
      paymentTermsDays: sourcingQuote.paymentTermsDays,
      isAwarded: sourcingQuote.isAwarded,
      notes: sourcingQuote.notes,
      currencyIso: currency.isoCode,
      supplierName: supplier.legalName,
    })
    .from(sourcingQuote)
    .leftJoin(supplier, eq(supplier.id, sourcingQuote.supplierId))
    .leftJoin(currency, eq(currency.id, sourcingQuote.currencyId))
    .where(eq(sourcingQuote.sourcingEventId, id))
    .orderBy(asc(sourcingQuote.amount));

  return { event: head, quotes };
}

export type SourcingEventInput = {
  title: string;
  categoryId: string | null;
  dueDate: string | null;
  status: SourcingStatus;
  baselineAmount: number | null;
};

export async function createSourcingEvent(
  tenantId: string,
  input: SourcingEventInput,
): Promise<{ id: string }> {
  if (input.categoryId) {
    const cat = await db
      .select({ id: category.id })
      .from(category)
      .where(and(eq(category.id, input.categoryId), eq(category.tenantId, tenantId)))
      .limit(1);
    if (!cat[0]) throw new Error("Categoria inválida.");
  }
  const inserted = await db
    .insert(sourcingEvent)
    .values({
      tenantId,
      title: input.title,
      categoryId: input.categoryId,
      status: input.status,
      dueDate: input.dueDate,
      baselineAmount: input.baselineAmount != null ? String(input.baselineAmount) : null,
    })
    .returning({ id: sourcingEvent.id });
  return { id: inserted[0].id };
}

/**
 * Savings de sourcing: para eventos com baseline definido e proposta adjudicada,
 * economia = baseline − valor adjudicado.
 */
export async function sourcingSavings(tenantId: string) {
  const rows = await db
    .select({
      id: sourcingEvent.id,
      title: sourcingEvent.title,
      baseline: sourcingEvent.baselineAmount,
      awarded: sourcingQuote.amount,
      supplierName: supplier.legalName,
      createdAt: sourcingEvent.createdAt,
    })
    .from(sourcingEvent)
    .innerJoin(
      sourcingQuote,
      and(eq(sourcingQuote.sourcingEventId, sourcingEvent.id), eq(sourcingQuote.isAwarded, true)),
    )
    .leftJoin(supplier, eq(supplier.id, sourcingQuote.supplierId))
    .where(and(eq(sourcingEvent.tenantId, tenantId), isNotNull(sourcingEvent.baselineAmount)))
    .orderBy(desc(sourcingEvent.createdAt));

  const events = rows.map((r) => {
    const baseline = Number(r.baseline ?? 0);
    const awarded = Number(r.awarded ?? 0);
    const savings = baseline - awarded;
    return {
      id: r.id,
      title: r.title,
      supplierName: r.supplierName,
      baseline,
      awarded,
      savings,
      savingsPct: baseline > 0 ? Math.round((savings / baseline) * 100) : 0,
    };
  });
  const totalSavings = events.reduce((a, e) => a + e.savings, 0);
  const totalBaseline = events.reduce((a, e) => a + e.baseline, 0);
  return {
    events,
    totalSavings,
    totalBaseline,
    avgPct: totalBaseline > 0 ? Math.round((totalSavings / totalBaseline) * 100) : 0,
  };
}

/* ---------------------------------------------------------------------------
 * Equalização ponderada (pesos + TCO/landed cost)
 * ------------------------------------------------------------------------- */

export type EqualizationWeights = {
  price: number;
  lead: number;
  quality: number;
  payment: number;
};

type EqInputQuote = {
  id: string;
  supplierName: string | null;
  currencyIso: string | null;
  amount: string | number;
  leadTimeDays: number | null;
  score: string | number | null;
  freightCost: string | number;
  taxCost: string | number;
  otherCost: string | number;
  paymentTermsDays: number | null;
  isAwarded: boolean;
};

export type EqualizedRow = EqInputQuote & {
  landed: number;
  priceScore: number;
  leadScore: number;
  qualityScore: number;
  paymentScore: number;
  weightedTotal: number;
  rank: number;
};

/**
 * Calcula o mapa de equalização: custo total (landed = valor + frete + imposto +
 * outros), notas normalizadas por critério (melhor da rodada = 100) e a nota
 * ponderada pelos pesos do evento. Ordena pela nota ponderada (a melhor pode
 * NÃO ser a de menor preço).
 */
export function equalizeQuotes(
  weights: EqualizationWeights,
  quotes: EqInputQuote[],
): { rows: EqualizedRow[]; bestId: string | null } {
  if (quotes.length === 0) return { rows: [], bestId: null };

  const landeds = quotes.map(
    (q) => Number(q.amount) + Number(q.freightCost) + Number(q.taxCost) + Number(q.otherCost),
  );
  const range = (vals: (number | null)[]) => {
    const v = vals.filter((x): x is number => x != null);
    return v.length ? [Math.min(...v), Math.max(...v)] : [0, 0];
  };
  // menor é melhor → melhor (min) recebe 100
  const normLow = (val: number | null, min: number, max: number) =>
    val == null ? 0 : max === min ? 100 : ((max - val) / (max - min)) * 100;
  // maior é melhor → melhor (max) recebe 100
  const normHigh = (val: number | null, min: number, max: number) =>
    val == null ? 0 : max === min ? 100 : ((val - min) / (max - min)) * 100;

  const [lMin, lMax] = [Math.min(...landeds), Math.max(...landeds)];
  const [ldMin, ldMax] = range(quotes.map((q) => q.leadTimeDays));
  const [qMin, qMax] = range(quotes.map((q) => (q.score != null ? Number(q.score) : null)));
  const [pMin, pMax] = range(quotes.map((q) => q.paymentTermsDays));

  const sumW = weights.price + weights.lead + weights.quality + weights.payment || 1;

  const rows: EqualizedRow[] = quotes.map((q, i) => {
    const priceScore = normLow(landeds[i], lMin, lMax);
    const leadScore = normLow(q.leadTimeDays, ldMin, ldMax);
    const qualityScore = normHigh(q.score != null ? Number(q.score) : null, qMin, qMax);
    const paymentScore = normHigh(q.paymentTermsDays, pMin, pMax);
    const weightedTotal =
      (priceScore * weights.price +
        leadScore * weights.lead +
        qualityScore * weights.quality +
        paymentScore * weights.payment) /
      sumW;
    return {
      ...q,
      landed: landeds[i],
      priceScore: Math.round(priceScore),
      leadScore: Math.round(leadScore),
      qualityScore: Math.round(qualityScore),
      paymentScore: Math.round(paymentScore),
      weightedTotal: Math.round(weightedTotal * 10) / 10,
      rank: 0,
    };
  });

  rows.sort((a, b) => b.weightedTotal - a.weightedTotal);
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return { rows, bestId: rows[0]?.id ?? null };
}

export async function setEventWeights(
  tenantId: string,
  eventId: string,
  weights: EqualizationWeights,
): Promise<void> {
  const ev = await db
    .select({ id: sourcingEvent.id })
    .from(sourcingEvent)
    .where(and(eq(sourcingEvent.id, eventId), eq(sourcingEvent.tenantId, tenantId)))
    .limit(1);
  if (!ev[0]) throw new Error("Evento não encontrado.");
  await db
    .update(sourcingEvent)
    .set({
      weightPrice: weights.price,
      weightLead: weights.lead,
      weightQuality: weights.quality,
      weightPayment: weights.payment,
    })
    .where(and(eq(sourcingEvent.id, eventId), eq(sourcingEvent.tenantId, tenantId)));
}

export async function listNegotiationRounds(tenantId: string, quoteId: string) {
  return db
    .select()
    .from(negotiationRound)
    .where(and(eq(negotiationRound.tenantId, tenantId), eq(negotiationRound.sourcingQuoteId, quoteId)))
    .orderBy(asc(negotiationRound.roundNumber));
}

/** Todas as rodadas de negociação das propostas de um evento (para o detalhe do RFQ). */
export async function listNegotiationsForEvent(tenantId: string, eventId: string) {
  return db
    .select({
      id: negotiationRound.id,
      sourcingQuoteId: negotiationRound.sourcingQuoteId,
      roundNumber: negotiationRound.roundNumber,
      amount: negotiationRound.amount,
      notes: negotiationRound.notes,
      createdAt: negotiationRound.createdAt,
    })
    .from(negotiationRound)
    .innerJoin(sourcingQuote, eq(sourcingQuote.id, negotiationRound.sourcingQuoteId))
    .where(and(eq(negotiationRound.tenantId, tenantId), eq(sourcingQuote.sourcingEventId, eventId)))
    .orderBy(asc(negotiationRound.roundNumber));
}

/**
 * Registra uma rodada de negociação e atualiza o valor corrente da proposta
 * para o valor negociado (o novo valor entra na equalização).
 */
export async function addNegotiationRound(
  tenantId: string,
  quoteId: string,
  amount: number,
  notes: string | null,
  userId: string,
): Promise<void> {
  const q = await db
    .select({ id: sourcingQuote.id, amount: sourcingQuote.amount })
    .from(sourcingQuote)
    .where(and(eq(sourcingQuote.id, quoteId), eq(sourcingQuote.tenantId, tenantId)))
    .limit(1);
  if (!q[0]) throw new Error("Proposta não encontrada.");

  const existing = await db
    .select({ c: count() })
    .from(negotiationRound)
    .where(and(eq(negotiationRound.tenantId, tenantId), eq(negotiationRound.sourcingQuoteId, quoteId)));
  let nextRound = Number(existing[0]?.c ?? 0) + 1;

  // Na primeira negociação, registra a proposta inicial como rodada 1.
  if (nextRound === 1) {
    await db.insert(negotiationRound).values({
      tenantId,
      sourcingQuoteId: quoteId,
      roundNumber: 1,
      amount: q[0].amount,
      notes: "Proposta inicial",
      createdBy: userId,
    });
    nextRound = 2;
  }

  await db.insert(negotiationRound).values({
    tenantId,
    sourcingQuoteId: quoteId,
    roundNumber: nextRound,
    amount: amount.toFixed(2),
    notes,
    createdBy: userId,
  });

  // o valor corrente da proposta passa a ser o valor negociado
  await db
    .update(sourcingQuote)
    .set({ amount: amount.toFixed(2) })
    .where(and(eq(sourcingQuote.id, quoteId), eq(sourcingQuote.tenantId, tenantId)));
}

export type SourcingQuoteInput = {
  sourcingEventId: string;
  supplierId: string;
  amount: number;
  currencyId: string | null;
  leadTimeDays: number | null;
  score: number | null;
  freightCost: number;
  taxCost: number;
  otherCost: number;
  paymentTermsDays: number | null;
  notes: string | null;
};

export async function addSourcingQuote(
  tenantId: string,
  input: SourcingQuoteInput,
): Promise<void> {
  const ev = await db
    .select({ id: sourcingEvent.id, status: sourcingEvent.status })
    .from(sourcingEvent)
    .where(and(eq(sourcingEvent.id, input.sourcingEventId), eq(sourcingEvent.tenantId, tenantId)))
    .limit(1);
  if (!ev[0]) throw new Error("Evento não encontrado.");
  const sup = await db
    .select({ id: supplier.id })
    .from(supplier)
    .where(and(eq(supplier.id, input.supplierId), eq(supplier.tenantId, tenantId)))
    .limit(1);
  if (!sup[0]) throw new Error("Fornecedor inválido.");

  let currencyId = input.currencyId;
  if (!currencyId) {
    const brl = await db
      .select({ id: currency.id })
      .from(currency)
      .where(eq(currency.isoCode, "BRL"))
      .limit(1);
    currencyId = brl[0]?.id ?? null;
  }

  await db.insert(sourcingQuote).values({
    tenantId,
    sourcingEventId: input.sourcingEventId,
    supplierId: input.supplierId,
    amount: input.amount.toFixed(2),
    currencyId,
    leadTimeDays: input.leadTimeDays,
    score: input.score != null ? String(input.score) : null,
    freightCost: input.freightCost.toFixed(2),
    taxCost: input.taxCost.toFixed(2),
    otherCost: input.otherCost.toFixed(2),
    paymentTermsDays: input.paymentTermsDays,
    notes: input.notes,
  });

  // Ao receber a primeira proposta, o evento entra em análise.
  if (ev[0].status === "aberto") {
    await db
      .update(sourcingEvent)
      .set({ status: "em_analise" })
      .where(and(eq(sourcingEvent.id, input.sourcingEventId), eq(sourcingEvent.tenantId, tenantId)));
  }
}

export async function awardSourcingQuote(
  tenantId: string,
  eventId: string,
  quoteId: string,
): Promise<void> {
  const ev = await db
    .select({ id: sourcingEvent.id })
    .from(sourcingEvent)
    .where(and(eq(sourcingEvent.id, eventId), eq(sourcingEvent.tenantId, tenantId)))
    .limit(1);
  if (!ev[0]) throw new Error("Evento não encontrado.");
  const qz = await db
    .select({ id: sourcingQuote.id })
    .from(sourcingQuote)
    .where(
      and(
        eq(sourcingQuote.id, quoteId),
        eq(sourcingQuote.tenantId, tenantId),
        eq(sourcingQuote.sourcingEventId, eventId),
      ),
    )
    .limit(1);
  if (!qz[0]) throw new Error("Cotação não encontrada.");

  await db
    .update(sourcingQuote)
    .set({ isAwarded: false })
    .where(eq(sourcingQuote.sourcingEventId, eventId));
  await db.update(sourcingQuote).set({ isAwarded: true }).where(eq(sourcingQuote.id, quoteId));
  await db
    .update(sourcingEvent)
    .set({ status: "adjudicado" })
    .where(and(eq(sourcingEvent.id, eventId), eq(sourcingEvent.tenantId, tenantId)));
}

/** Gera um pedido de compra (1 item) a partir da cotação vencedora do evento. */
export async function generatePoFromQuote(
  tenantId: string,
  quoteId: string,
): Promise<{ poId: string; poNumber: string }> {
  const rows = await db
    .select({
      supplierId: sourcingQuote.supplierId,
      amount: sourcingQuote.amount,
      currencyId: sourcingQuote.currencyId,
      isAwarded: sourcingQuote.isAwarded,
      eventTitle: sourcingEvent.title,
    })
    .from(sourcingQuote)
    .innerJoin(sourcingEvent, eq(sourcingEvent.id, sourcingQuote.sourcingEventId))
    .where(and(eq(sourcingQuote.id, quoteId), eq(sourcingQuote.tenantId, tenantId)))
    .limit(1);
  const q = rows[0];
  if (!q) throw new Error("Cotação não encontrada.");
  if (!q.isAwarded) throw new Error("Gere o pedido a partir da cotação vencedora.");

  let currencyId = q.currencyId;
  if (!currencyId) {
    const brl = await db
      .select({ id: currency.id })
      .from(currency)
      .where(eq(currency.isoCode, "BRL"))
      .limit(1);
    currencyId = brl[0]?.id ?? null;
  }
  if (!currencyId) throw new Error("Moeda indisponível para gerar o pedido.");

  const cnt = await db
    .select({ c: count() })
    .from(purchaseOrder)
    .where(eq(purchaseOrder.tenantId, tenantId));
  const year = new Date().toISOString().slice(0, 4);
  const poNumber = `PO-${year}-${String(9000 + (cnt[0]?.c ?? 0) + 1).padStart(4, "0")}`;

  const res = await createPurchaseOrder(tenantId, {
    poNumber,
    supplierId: q.supplierId,
    currencyId,
    licenseeId: null,
    status: "rascunho",
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDate: null,
    incoterm: null,
    notes: `Gerado da cotação vencedora — ${q.eventTitle}`,
    items: [{ description: q.eventTitle, sku: null, quantity: 1, unitPrice: Number(q.amount) }],
  });
  return { poId: res.id, poNumber };
}
