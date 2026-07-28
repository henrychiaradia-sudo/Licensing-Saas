"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { createCatalogItem, createCategory, type CatalogItemInput } from "@/lib/data/catalog";
import { logAudit } from "@/lib/data/audit";
import { itemSchema, categorySchema } from "./schema";

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

function canWriteCatalog(session: Parameters<typeof can>[0]) {
  return session.isInternal || can(session, PERMISSIONS.contractWrite) || can(session, PERMISSIONS.brandWrite);
}

export async function createItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteCatalog(session)) {
    return { error: "Você não tem permissão para editar o catálogo." };
  }
  const candidate = {
    sku: String(formData.get("sku") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    description: emptyToNull(formData.get("description")),
    categoryId: emptyToNull(formData.get("categoryId")),
    brandId: emptyToNull(formData.get("brandId")),
    ncm: emptyToNull(formData.get("ncm")),
    cest: emptyToNull(formData.get("cest")),
    unit: String(formData.get("unit") ?? "un"),
    listPrice: numOrZero(formData.get("listPrice")),
    status: String(formData.get("status") ?? "ativo"),
  };
  const parsed = itemSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input: CatalogItemInput = parsed.data;
  let id: string;
  try {
    id = (await createCatalogItem(session.tenantId, input, session.userId)).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar o item." };
  }
  await logAudit(
    session.tenantId,
    session.userId,
    "catalog.item.create",
    "catalog_item",
    id,
    `Item ${input.sku} — ${input.name}`,
  );
  redirect(`/catalogo/${id}`);
}

export async function createCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteCatalog(session)) {
    return { error: "Você não tem permissão para editar categorias." };
  }
  const candidate = {
    name: String(formData.get("name") ?? "").trim(),
    code: emptyToNull(formData.get("code")),
    parentId: emptyToNull(formData.get("parentId")),
  };
  const parsed = categorySchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await createCategory(session.tenantId, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar a categoria." };
  }
  await logAudit(
    session.tenantId,
    session.userId,
    "category.create",
    "category",
    null,
    `Categoria "${parsed.data.name}" criada`,
  );
  revalidatePath("/categorias");
  return { error: null };
}
