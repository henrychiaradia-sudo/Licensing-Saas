import "server-only";
import { eq, desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { sourcingEvent, sourcingQuote, supplier, currency } from "@/lib/db/schema";

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
