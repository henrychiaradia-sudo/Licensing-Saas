"use server";

import { redirect } from "next/navigation";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  createPurchaseCategory,
  updatePurchaseCategory,
  type PurchaseCategoryInput,
} from "@/lib/data/purchase-categories";
import { logAudit } from "@/lib/data/audit";
import { categorySchema } from "./schema";

export type FormState = { error: string | null };

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}
function numOrZero(v: FormDataEntryValue | null): number {
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
  return categorySchema.safeParse({
    code: String(formData.get("code") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    nature: String(formData.get("nature") ?? "opex"),
    ownerName: emptyToNull(formData.get("ownerName")),
    annualBudget: numOrZero(formData.get("annualBudget")),
    strategy: emptyToNull(formData.get("strategy")),
    status: String(formData.get("status") ?? "ativa"),
    notes: emptyToNull(formData.get("notes")),
  });
}

export async function createCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!canWrite(session)) return { error: "Você não tem permissão para gerenciar categorias." };
  const parsed = read(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const input: PurchaseCategoryInput = parsed.data;
  let id: string;
  try {
    id = (await createPurchaseCategory(session.tenantId, input, session.userId)).id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    return { error: msg.includes("uq_purchase_category_code") ? "Já existe uma categoria com esse código." : msg || "Não foi possível criar." };
  }
  await logAudit(session.tenantId, session.userId, "purchase_category.create", "purchase_category", id, `Categoria "${input.name}" criada`);
  redirect(`/categorias-compras/${id}`);
}

export async function updateCategoryAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!canWrite(session)) return { error: "Sem permissão." };
  const parsed = read(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    await updatePurchaseCategory(session.tenantId, id, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar." };
  }
  await logAudit(session.tenantId, session.userId, "purchase_category.update", "purchase_category", id, `Categoria "${parsed.data.name}" atualizada`);
  redirect(`/categorias-compras/${id}`);
}
