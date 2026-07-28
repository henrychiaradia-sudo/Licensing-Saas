"use server";

import { redirect } from "next/navigation";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { createCostSheet, updateCostSheet, type CostSheetInput } from "@/lib/data/cost-sheets";
import { logAudit } from "@/lib/data/audit";
import { costSheetSchema } from "./schema";
import { COST_FIELD_KEYS } from "@/lib/costing";

export type FormState = { error: string | null };

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}
function num(v: FormDataEntryValue | null): number {
  if (v == null) return 0;
  let s = String(v).trim();
  if (s === "") return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function canWrite(session: Parameters<typeof can>[0]) {
  return session.isInternal || can(session, PERMISSIONS.contractWrite);
}

function read(formData: FormData) {
  const candidate: Record<string, unknown> = {
    name: String(formData.get("name") ?? "").trim(),
    productId: emptyToNull(formData.get("productId")),
    supplierId: emptyToNull(formData.get("supplierId")),
    sku: emptyToNull(formData.get("sku")),
    currency: String(formData.get("currency") ?? "BRL").trim() || "BRL",
    notes: emptyToNull(formData.get("notes")),
  };
  for (const k of COST_FIELD_KEYS) candidate[k] = num(formData.get(k));
  return costSheetSchema.safeParse(candidate);
}

export async function createCostSheetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!canWrite(session)) return { error: "Você não tem permissão para gerenciar fichas de custo." };
  const parsed = read(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const input = parsed.data as CostSheetInput;
  let id: string;
  try {
    id = (await createCostSheet(session.tenantId, input, session.userId)).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar a ficha." };
  }
  await logAudit(session.tenantId, session.userId, "cost_sheet.create", "cost_sheet", id, `Ficha de custo "${input.name}" criada`);
  redirect(`/custos/${id}`);
}

export async function updateCostSheetAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!canWrite(session)) return { error: "Sem permissão." };
  const parsed = read(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    await updateCostSheet(session.tenantId, id, parsed.data as CostSheetInput);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar." };
  }
  await logAudit(session.tenantId, session.userId, "cost_sheet.update", "cost_sheet", id, `Ficha de custo "${parsed.data.name}" atualizada`);
  redirect(`/custos/${id}`);
}
