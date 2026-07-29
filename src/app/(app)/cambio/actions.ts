"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { addFxRate, addHedge, setHedgeStatus, syncLiveRates } from "@/lib/data/fx";
import { logAudit } from "@/lib/data/audit";
import { fxRateSchema, hedgeSchema, hedgeStatusSchema } from "./schema";
import type { HedgeStatus } from "@/lib/db/schema";

export type FormState = { error: string | null; ok?: boolean; message?: string };

export async function syncLiveRatesAction(_prev: FormState, _formData: FormData): Promise<FormState> {
  const session = await requireSession();
  try {
    const { updated } = await syncLiveRates(session.tenantId, session.userId);
    await logAudit(
      session.tenantId,
      session.userId,
      "fx.sync",
      "currency",
      session.tenantId,
      `Cotações sincronizadas via AwesomeAPI (${updated} moeda(s))`,
    );
    revalidatePath("/cambio");
    return {
      error: null,
      ok: true,
      message: updated > 0 ? `${updated} moeda(s) atualizada(s) com a cotação ao vivo.` : "Nenhuma moeda correspondente para atualizar.",
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Falha ao sincronizar as cotações." };
  }
}

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

export async function addFxRateAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const candidate = {
    currencyId: String(formData.get("currencyId") ?? ""),
    rateToBase: numOrNull(formData.get("rateToBase")) ?? 0,
    rateDate: String(formData.get("rateDate") ?? "").trim(),
    source: emptyToNull(formData.get("source")),
  };
  const parsed = fxRateSchema.safeParse(candidate);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    await addFxRate(session.tenantId, parsed.data, session.userId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar a cotação." };
  }
  await logAudit(
    session.tenantId,
    session.userId,
    "fx.rate",
    "currency",
    parsed.data.currencyId,
    `Cotação registrada: ${parsed.data.rateToBase} BRL em ${parsed.data.rateDate}`,
  );
  revalidatePath("/cambio");
  return { error: null, ok: true };
}

export async function addHedgeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const candidate = {
    currencyId: String(formData.get("currencyId") ?? ""),
    instrument: String(formData.get("instrument") ?? "ndf"),
    side: String(formData.get("side") ?? "compra"),
    notional: numOrNull(formData.get("notional")) ?? 0,
    strikeRate: numOrNull(formData.get("strikeRate")) ?? 0,
    tradeDate: String(formData.get("tradeDate") ?? "").trim(),
    maturityDate: String(formData.get("maturityDate") ?? "").trim(),
    counterparty: emptyToNull(formData.get("counterparty")),
    notes: emptyToNull(formData.get("notes")),
  };
  const parsed = hedgeSchema.safeParse(candidate);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    const { contractNumber } = await addHedge(session.tenantId, parsed.data, session.userId);
    await logAudit(
      session.tenantId,
      session.userId,
      "fx.hedge",
      "hedge_contract",
      contractNumber,
      `Hedge ${contractNumber} (${parsed.data.instrument.toUpperCase()}) — notional ${parsed.data.notional}`,
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar o hedge." };
  }
  revalidatePath("/cambio");
  return { error: null, ok: true };
}

export async function setHedgeStatusAction(hedgeId: string, status: string): Promise<void> {
  const session = await requireSession();
  const parsed = hedgeStatusSchema.safeParse({ status });
  if (!parsed.success) return;
  await setHedgeStatus(session.tenantId, hedgeId, parsed.data.status as HedgeStatus);
  await logAudit(
    session.tenantId,
    session.userId,
    "fx.hedge.status",
    "hedge_contract",
    hedgeId,
    `Hedge marcado como ${parsed.data.status}`,
  );
  revalidatePath("/cambio");
}
