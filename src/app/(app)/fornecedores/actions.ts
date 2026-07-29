"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  createSupplier,
  updateSupplier,
  setSupplierStatus,
  addContact,
  addBankAccount,
  addPlant,
  addCertification,
  addAudit,
  setServedCategories,
  deleteSubEntity,
  type SupplierInput,
} from "@/lib/data/suppliers";
import { logAudit } from "@/lib/data/audit";
import { createEvaluation, type EvaluationInput } from "@/lib/data/evaluations";
import {
  addDocument,
  setDocumentStatus,
  deleteDocument,
} from "@/lib/data/documents";
import {
  startHomologation,
  saveAnswer,
  decideHomologation,
} from "@/lib/data/homologation";
import { supplierSchema, evaluationSchema, SUPPLIER_STATUS } from "./schema";
import { DOC_TYPE_OPTIONS, DOC_STATUS_OPTIONS, ITEM_RESULT_OPTIONS } from "./doc-meta";
import type {
  SupplierStatus,
  SupplierDocType,
  SupplierDocStatus,
  HomologationItemResult,
} from "@/lib/db/schema";

const SUPPLIER_STATUS_VALUES = SUPPLIER_STATUS;

export type FormState = { error: string | null };
export type SubState = { error: string | null; ok?: boolean };

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
    supplierType: emptyToNull(formData.get("supplierType")),
    economicGroup: emptyToNull(formData.get("economicGroup")),
    cnpj: emptyToNull(formData.get("cnpj")),
    stateRegistration: emptyToNull(formData.get("stateRegistration")),
    category: String(formData.get("category") ?? "manufatura"),
    countryId: emptyToNull(formData.get("countryId")),
    stateProvince: emptyToNull(formData.get("stateProvince")),
    city: emptyToNull(formData.get("city")),
    address: emptyToNull(formData.get("address")),
    website: emptyToNull(formData.get("website")),
    capacity: emptyToNull(formData.get("capacity")),
    moq: intOrNull(formData.get("moq")),
    incoterms: emptyToNull(formData.get("incoterms")),
    currencies: emptyToNull(formData.get("currencies")),
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

export async function changeStatusAction(id: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!canWriteSupplier(session)) return;
  const status = String(formData.get("status") ?? "");
  if (!(SUPPLIER_STATUS_VALUES as readonly string[]).includes(status)) return;
  await setSupplierStatus(session.tenantId, id, status as SupplierStatus);
  await logAudit(session.tenantId, session.userId, "supplier.status", "supplier", id, `Status → ${status}`);
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

/* ------------------------- Sub-entidades (360) ------------------------- */

async function guard() {
  const session = await requireSession();
  if (!canWriteSupplier(session)) throw new Error("Sem permissão.");
  return session;
}
const rev = (id: string) => revalidatePath(`/fornecedores/${id}`);

export async function addContactAction(id: string, _p: SubState, fd: FormData): Promise<SubState> {
  const s = await guard();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome." };
  try {
    await addContact(s.tenantId, id, {
      name,
      role: emptyToNull(fd.get("role")),
      email: emptyToNull(fd.get("email")),
      phone: emptyToNull(fd.get("phone")),
      isPrimary: fd.get("isPrimary") === "1",
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro." };
  }
  rev(id);
  return { error: null, ok: true };
}

export async function addBankAction(id: string, _p: SubState, fd: FormData): Promise<SubState> {
  const s = await guard();
  const bankName = String(fd.get("bankName") ?? "").trim();
  if (!bankName) return { error: "Informe o banco." };
  try {
    await addBankAccount(s.tenantId, id, {
      bankName,
      agency: emptyToNull(fd.get("agency")),
      accountNumber: emptyToNull(fd.get("accountNumber")),
      accountType: null,
      pixKey: emptyToNull(fd.get("pixKey")),
      swift: null,
      currency: String(fd.get("currency") ?? "BRL"),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro." };
  }
  rev(id);
  return { error: null, ok: true };
}

export async function addPlantAction(id: string, _p: SubState, fd: FormData): Promise<SubState> {
  const s = await guard();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Informe a planta." };
  try {
    await addPlant(s.tenantId, id, {
      name,
      country: emptyToNull(fd.get("country")),
      city: emptyToNull(fd.get("city")),
      capacity: emptyToNull(fd.get("capacity")),
      certifications: emptyToNull(fd.get("certifications")),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro." };
  }
  rev(id);
  return { error: null, ok: true };
}

export async function addCertAction(id: string, _p: SubState, fd: FormData): Promise<SubState> {
  const s = await guard();
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { error: "Informe a certificação." };
  try {
    await addCertification(s.tenantId, id, {
      name,
      number: emptyToNull(fd.get("number")),
      issuer: emptyToNull(fd.get("issuer")),
      issueDate: emptyToNull(fd.get("issueDate")),
      validUntil: emptyToNull(fd.get("validUntil")),
      status: "valido",
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro." };
  }
  rev(id);
  return { error: null, ok: true };
}

export async function addAuditAction(id: string, _p: SubState, fd: FormData): Promise<SubState> {
  const s = await guard();
  try {
    await addAudit(s.tenantId, id, {
      auditDate: emptyToNull(fd.get("auditDate")),
      auditType: emptyToNull(fd.get("auditType")),
      result: String(fd.get("result") ?? "aprovado"),
      score: intOrNull(fd.get("score")),
      auditor: emptyToNull(fd.get("auditor")),
      findings: emptyToNull(fd.get("findings")),
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro." };
  }
  rev(id);
  return { error: null, ok: true };
}

export async function setServedCategoriesAction(id: string, formData: FormData): Promise<void> {
  const s = await guard();
  const ids = formData.getAll("categoryIds").map((v) => String(v)).filter(Boolean);
  await setServedCategories(s.tenantId, id, ids);
  rev(id);
}

export async function deleteSubAction(id: string, table: string, subId: string): Promise<void> {
  const s = await guard();
  const valid = ["contact", "bank", "plant", "cert", "audit", "served"] as const;
  if (!(valid as readonly string[]).includes(table)) return;
  await deleteSubEntity(s.tenantId, table as (typeof valid)[number], subId);
  rev(id);
}

/* ------------------------- Documentos ------------------------- */

const DOC_TYPE_VALUES = DOC_TYPE_OPTIONS.map((o) => o.value);
const DOC_STATUS_VALUES = DOC_STATUS_OPTIONS.map((o) => o.value);
const ITEM_RESULT_VALUES = ITEM_RESULT_OPTIONS.map((o) => o.value);

export async function addDocumentAction(id: string, _p: SubState, fd: FormData): Promise<SubState> {
  const s = await guard();
  const docType = String(fd.get("docType") ?? "");
  if (!(DOC_TYPE_VALUES as readonly string[]).includes(docType)) {
    return { error: "Selecione o tipo de documento." };
  }
  try {
    await addDocument(s.tenantId, id, {
      docType: docType as SupplierDocType,
      name: emptyToNull(fd.get("name")),
      number: emptyToNull(fd.get("number")),
      issuer: emptyToNull(fd.get("issuer")),
      issueDate: emptyToNull(fd.get("issueDate")),
      validUntil: emptyToNull(fd.get("validUntil")),
      fileName: emptyToNull(fd.get("fileName")),
      responsible: emptyToNull(fd.get("responsible")),
      notes: emptyToNull(fd.get("notes")),
    });
    await logAudit(s.tenantId, s.userId, "supplier.document.add", "supplier", id, `Documento (${docType}) adicionado`);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao salvar documento." };
  }
  rev(id);
  return { error: null, ok: true };
}

export async function setDocStatusAction(id: string, docId: string, status: string): Promise<void> {
  const s = await guard();
  if (!(DOC_STATUS_VALUES as readonly string[]).includes(status)) return;
  await setDocumentStatus(s.tenantId, docId, status as SupplierDocStatus, s.name);
  await logAudit(s.tenantId, s.userId, "supplier.document.status", "supplier", id, `Documento → ${status}`);
  rev(id);
}

export async function deleteDocumentAction(id: string, docId: string): Promise<void> {
  const s = await guard();
  await deleteDocument(s.tenantId, docId);
  rev(id);
}

/* ------------------------- Homologação ------------------------- */

export async function startHomologationAction(id: string, formData: FormData): Promise<void> {
  const s = await guard();
  const checklistId = String(formData.get("checklistId") ?? "");
  if (!checklistId) return;
  await startHomologation(s.tenantId, id, checklistId);
  await logAudit(s.tenantId, s.userId, "supplier.homologation.start", "supplier", id, "Homologação iniciada");
  rev(id);
}

export async function saveAnswerAction(
  id: string,
  homologationId: string,
  itemId: string,
  formData: FormData,
): Promise<void> {
  const s = await guard();
  const result = String(formData.get("result") ?? "");
  if (!(ITEM_RESULT_VALUES as readonly string[]).includes(result)) return;
  await saveAnswer(
    s.tenantId,
    homologationId,
    itemId,
    result as HomologationItemResult,
    emptyToNull(formData.get("notes")),
  );
  rev(id);
}

export async function decideHomologationAction(
  id: string,
  homologationId: string,
  decision: string,
): Promise<void> {
  const s = await guard();
  if (!["aprovada", "condicional", "reprovada"].includes(decision)) return;
  await decideHomologation(
    s.tenantId,
    homologationId,
    decision as "aprovada" | "condicional" | "reprovada",
    s.name,
  );
  await logAudit(s.tenantId, s.userId, "supplier.homologation.decide", "supplier", id, `Homologação → ${decision}`);
  rev(id);
}
