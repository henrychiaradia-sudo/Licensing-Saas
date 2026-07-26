"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  createInspection,
  setInspectionResult,
  addNonConformity,
  type InspectionInput,
  type NonConformityInput,
} from "@/lib/data/quality";
import { logAudit } from "@/lib/data/audit";
import { inspectionSchema, ncSchema, QUALITY_RESULT, NC_STATUS } from "./schema";
import type { QualityResult, NcStatus } from "@/lib/db/schema";

export type FormState = { error: string | null };

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}
function intOrZero(v: FormDataEntryValue | null): number {
  if (v == null) return 0;
  const s = String(v).trim();
  if (s === "") return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : 0;
}

// Qualidade é operada por usuários internos (compras/qualidade).
function canWriteQuality(session: Parameters<typeof can>[0]) {
  return (
    session.isInternal ||
    can(session, PERMISSIONS.financeWrite) ||
    can(session, PERMISSIONS.contractWrite)
  );
}

const resultLabel: Record<QualityResult, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  aprovado_condicional: "Aprovado com ressalvas",
  reprovado: "Reprovado",
};

export async function createInspectionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteQuality(session)) {
    return { error: "Você não tem permissão para registrar inspeções." };
  }

  const candidate = {
    inspectionType: String(formData.get("inspectionType") ?? "recebimento"),
    title: String(formData.get("title") ?? "").trim(),
    supplierId: emptyToNull(formData.get("supplierId")),
    sampleSize: intOrZero(formData.get("sampleSize")),
    defectsFound: intOrZero(formData.get("defectsFound")),
    result: String(formData.get("result") ?? "pendente"),
    inspectedAt: emptyToNull(formData.get("inspectedAt")),
    notes: emptyToNull(formData.get("notes")),
  };

  const parsed = inspectionSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input: InspectionInput = parsed.data;

  let id: string;
  try {
    id = (await createInspection(session.tenantId, input, session.userId)).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar a inspeção." };
  }

  await logAudit(
    session.tenantId,
    session.userId,
    "quality.inspection.create",
    "quality_inspection",
    id,
    `Inspeção "${input.title}" — resultado ${resultLabel[input.result]}`,
  );

  redirect(`/qualidade/${id}`);
}

export async function setInspectionResultAction(id: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!canWriteQuality(session)) return;
  const result = String(formData.get("result") ?? "");
  if (!(QUALITY_RESULT as readonly string[]).includes(result)) return;
  await setInspectionResult(session.tenantId, id, result as QualityResult);
  await logAudit(
    session.tenantId,
    session.userId,
    "quality.inspection.result",
    "quality_inspection",
    id,
    `Resultado atualizado para ${resultLabel[result as QualityResult]}`,
  );
  revalidatePath(`/qualidade/${id}`);
  revalidatePath("/qualidade");
}

export async function addNcAction(
  inspectionId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteQuality(session)) {
    return { error: "Você não tem permissão para registrar não-conformidades." };
  }

  const candidate = {
    severity: String(formData.get("severity") ?? "media"),
    description: String(formData.get("description") ?? "").trim(),
    disposition: emptyToNull(formData.get("disposition")),
    correctiveAction: emptyToNull(formData.get("correctiveAction")),
  };

  const parsed = ncSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const input: NonConformityInput = {
    inspectionId,
    severity: parsed.data.severity,
    description: parsed.data.description,
    disposition: parsed.data.disposition,
    correctiveAction: parsed.data.correctiveAction,
  };

  let ncId: string;
  try {
    ncId = (await addNonConformity(session.tenantId, input, session.userId)).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar a não-conformidade." };
  }

  await logAudit(
    session.tenantId,
    session.userId,
    "quality.nc.create",
    "non_conformity",
    ncId,
    `Não-conformidade (${input.severity}) registrada na inspeção`,
  );

  revalidatePath(`/qualidade/${inspectionId}`);
  return { error: null };
}

export async function setNcStatusAction(id: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!canWriteQuality(session)) return;
  const status = String(formData.get("status") ?? "");
  const inspectionId = String(formData.get("inspectionId") ?? "");
  if (!(NC_STATUS as readonly string[]).includes(status)) return;
  const { setNcStatus } = await import("@/lib/data/quality");
  await setNcStatus(session.tenantId, id, status as NcStatus);
  await logAudit(
    session.tenantId,
    session.userId,
    "quality.nc.status",
    "non_conformity",
    id,
    `Status da não-conformidade → ${status}`,
  );
  if (inspectionId) revalidatePath(`/qualidade/${inspectionId}`);
}
