import "server-only";
import { and, eq, desc, asc, inArray, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  sourcingEvent,
  sourcingQuote,
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
    })
    .returning({ id: sourcingEvent.id });
  return { id: inserted[0].id };
}

export type SourcingQuoteInput = {
  sourcingEventId: string;
  supplierId: string;
  amount: number;
  currencyId: string | null;
  leadTimeDays: number | null;
  score: number | null;
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
