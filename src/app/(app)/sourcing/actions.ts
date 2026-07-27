"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import {
  createSourcingEvent,
  addSourcingQuote,
  awardSourcingQuote,
  generatePoFromQuote,
  setEventWeights,
  addNegotiationRound,
} from "@/lib/data/sourcing";
import { logAudit } from "@/lib/data/audit";
import { sourcingEventSchema, sourcingQuoteSchema, weightsSchema } from "./schema";

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
    baselineAmount: numOrNull(formData.get("baselineAmount")),
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
    freightCost: numOrNull(formData.get("freightCost")) ?? 0,
    taxCost: numOrNull(formData.get("taxCost")) ?? 0,
    otherCost: numOrNull(formData.get("otherCost")) ?? 0,
    paymentTermsDays: intOrNull(formData.get("paymentTermsDays")),
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

export async function setWeightsAction(
  eventId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  const candidate = {
    price: intOrNull(formData.get("price")) ?? 0,
    lead: intOrNull(formData.get("lead")) ?? 0,
    quality: intOrNull(formData.get("quality")) ?? 0,
    payment: intOrNull(formData.get("payment")) ?? 0,
  };
  const parsed = weightsSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Pesos inválidos." };
  }
  try {
    await setEventWeights(session.tenantId, eventId, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar os pesos." };
  }
  await logAudit(
    session.tenantId,
    session.userId,
    "sourcing.weights",
    "sourcing_event",
    eventId,
    `Pesos: preço ${parsed.data.price} / prazo ${parsed.data.lead} / qualidade ${parsed.data.quality} / pagamento ${parsed.data.payment}`,
  );
  revalidatePath(`/sourcing/${eventId}`);
  return { error: null };
}

export async function addNegotiationAction(
  eventId: string,
  quoteId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  const amount = numOrNull(formData.get("amount"));
  const notes = emptyToNull(formData.get("notes"));
  if (amount == null || amount <= 0) {
    return { error: "Informe o valor negociado." };
  }
  try {
    await addNegotiationRound(session.tenantId, quoteId, amount, notes, session.userId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar a rodada." };
  }
  await logAudit(
    session.tenantId,
    session.userId,
    "sourcing.negotiation",
    "sourcing_event",
    eventId,
    `Rodada de negociação registrada (${amount.toFixed(2)})`,
  );
  revalidatePath(`/sourcing/${eventId}`);
  return { error: null };
}

export async function awardQuoteAction(eventId: string, quoteId: string): Promise<void> {
  const session = await requireSession();
  await awardSourcingQuote(session.tenantId, eventId, quoteId);
  await logAudit(
    session.tenantId,
    session.userId,
    "sourcing.award",
    "sourcing_event",
    eventId,
    "Proposta vencedora selecionada",
  );
  revalidatePath(`/sourcing/${eventId}`);
}

export async function generatePoAction(quoteId: string): Promise<void> {
  const session = await requireSession();
  const { poId } = await generatePoFromQuote(session.tenantId, quoteId);
  redirect(`/compras/${poId}`);
}
