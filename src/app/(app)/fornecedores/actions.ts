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
import { logAudit } from "@/lib/data/audit";
import { createEvaluation, type EvaluationInput } from "@/lib/data/evaluations";
import { supplierSchema, evaluationSchema } from "./schema";
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
function intOrZero(v: FormDataEntryValue | null): number {
  const n = intOrNull(v);
  return n == null ? 0 : n;
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
    if (id) {
      await updateSupplier(session.tenantId, id, input);
      await logAudit(
        session.tenantId,
        session.userId,
        "supplier.update",
        "supplier",
        id,
        `Fornecedor ${input.legalName} atualizado`,
      );
    } else {
      const res = await createSupplier(session.tenantId, input);
      await logAudit(
        session.tenantId,
        session.userId,
        "supplier.create",
        "supplier",
        res.id,
        `Fornecedor ${input.legalName} cadastrado`,
      );
    }
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
  await logAudit(
    session.tenantId,
    session.userId,
    "supplier.status",
    "supplier",
    id,
    `Status do fornecedor → ${status}`,
  );
  revalidatePath(`/fornecedores/${id}`);
  revalidatePath("/fornecedores");
}

export async function createEvaluationAction(
  supplierId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteSupplier(session)) {
    return { error: "Você não tem permissão para avaliar fornecedores." };
  }

  const candidate = {
    supplierId,
    periodLabel: String(formData.get("periodLabel") ?? "").trim(),
    qualityScore: intOrZero(formData.get("qualityScore")),
    deliveryScore: intOrZero(formData.get("deliveryScore")),
    costScore: intOrZero(formData.get("costScore")),
    complianceScore: intOrZero(formData.get("complianceScore")),
    riskLevel: String(formData.get("riskLevel") ?? "medio"),
    strengths: emptyToNull(formData.get("strengths")),
    weaknesses: emptyToNull(formData.get("weaknesses")),
    notes: emptyToNull(formData.get("notes")),
    evaluatedAt: emptyToNull(formData.get("evaluatedAt")),
  };

  const parsed = evaluationSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input: EvaluationInput = parsed.data;

  let id: string;
  try {
    id = (await createEvaluation(session.tenantId, input, session.userId)).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar a avaliação." };
  }

  await logAudit(
    session.tenantId,
    session.userId,
    "supplier.evaluation",
    "supplier",
    supplierId,
    `Avaliação ${input.periodLabel} — risco ${input.riskLevel}`,
  );

  revalidatePath(`/fornecedores/${supplierId}`);
  return { error: null };
}
