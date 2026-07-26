"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import {
  createSourcingEvent,
  addSourcingQuote,
  awardSourcingQuote,
  generatePoFromQuote,
} from "@/lib/data/sourcing";
import { sourcingEventSchema, sourcingQuoteSchema } from "./schema";

export type FormState = { error: string | null };

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}
function numOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  let s = String(v).trim();
  if (s === "") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function intOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

export async function createSourcingEventAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  const candidate = {
    title: String(formData.get("title") ?? "").trim(),
    categoryId: emptyToNull(formData.get("categoryId")),
    dueDate: emptyToNull(formData.get("dueDate")),
    status: String(formData.get("status") ?? "aberto"),
  };
  const parsed = sourcingEventSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  let id: string;
  try {
    id = (await createSourcingEvent(session.tenantId, parsed.data)).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar o RFQ." };
  }
  revalidatePath("/sourcing");
  redirect(`/sourcing/${id}`);
}

export async function addQuoteAction(
  eventId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  const candidate = {
    supplierId: String(formData.get("supplierId") ?? ""),
    amount: numOrNull(formData.get("amount")) ?? 0,
    leadTimeDays: intOrNull(formData.get("leadTimeDays")),
    score: numOrNull(formData.get("score")),
    notes: emptyToNull(formData.get("notes")),
  };
  const parsed = sourcingQuoteSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await addSourcingQuote(session.tenantId, {
      sourcingEventId: eventId,
      currencyId: null,
      ...parsed.data,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar a proposta." };
  }
  revalidatePath(`/sourcing/${eventId}`);
  return { error: null };
}

export async function awardQuoteAction(eventId: string, quoteId: string): Promise<void> {
  const session = await requireSession();
  await awardSourcingQuote(session.tenantId, eventId, quoteId);
  revalidatePath(`/sourcing/${eventId}`);
}

export async function generatePoAction(quoteId: string): Promise<void> {
  const session = await requireSession();
  const { poId } = await generatePoFromQuote(session.tenantId, quoteId);
  redirect(`/compras/${poId}`);
}
