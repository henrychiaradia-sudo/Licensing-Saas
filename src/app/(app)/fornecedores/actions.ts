"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  createSupplier,
  updateSupplier,
  setSupplierStatus,
  type SupplierInput,
} from "@/lib/data/suppliers";
import { supplierSchema } from "./schema";
import type { SupplierStatus } from "@/lib/db/schema";

const SUPPLIER_STATUS_VALUES = ["em_homologacao", "ativo", "inativo", "bloqueado"] as const;

export type FormState = { error: string | null };

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}
function numOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(",", ".");
  if (s === "") return null;
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

// Fornecedores usam permissão de compras; se não houver, cai para acesso interno.
function canWriteSupplier(session: Parameters<typeof can>[0]) {
  return (
    can(session, PERMISSIONS.financeWrite) ||
    can(session, PERMISSIONS.contractWrite) ||
    session.isInternal
  );
}

export async function saveSupplier(
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteSupplier(session)) {
    return { error: "Você não tem permissão para editar fornecedores." };
  }

  const candidate = {
    code: String(formData.get("code") ?? "").trim(),
    legalName: String(formData.get("legalName") ?? "").trim(),
    tradeName: emptyToNull(formData.get("tradeName")),
    category: String(formData.get("category") ?? "manufatura"),
    countryId: emptyToNull(formData.get("countryId")),
    city: emptyToNull(formData.get("city")),
    status: String(formData.get("status") ?? "em_homologacao"),
    rating: numOrNull(formData.get("rating")),
    leadTimeDays: intOrNull(formData.get("leadTimeDays")),
    paymentTerms: emptyToNull(formData.get("paymentTerms")),
    email: emptyToNull(formData.get("email")),
    phone: emptyToNull(formData.get("phone")),
  };

  const parsed = supplierSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input: SupplierInput = parsed.data;

  try {
    if (id) await updateSupplier(session.tenantId, id, input);
    else await createSupplier(session.tenantId, input);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar o fornecedor." };
  }

  revalidatePath("/fornecedores");
  redirect("/fornecedores");
}

export async function setSupplierStatusAction(id: string, status: string): Promise<void> {
  const session = await requireSession();
  if (!canWriteSupplier(session)) return;
  if (!(SUPPLIER_STATUS_VALUES as readonly string[]).includes(status)) return;
  await setSupplierStatus(session.tenantId, id, status as SupplierStatus);
  revalidatePath(`/fornecedores/${id}`);
  revalidatePath("/fornecedores");
}
