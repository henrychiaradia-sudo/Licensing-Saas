"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  createLegalCase,
  setLegalCaseStatus,
  addLegalEvent,
  type LegalCaseInput,
  type LegalEventInput,
} from "@/lib/data/legal";
import { logAudit } from "@/lib/data/audit";
import { legalCaseSchema, legalEventSchema, LEGAL_CASE_STATUS } from "./schema";
import type { LegalCaseStatus } from "@/lib/db/schema";

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

function canWriteLegal(session: Parameters<typeof can>[0]) {
  return session.isInternal || can(session, PERMISSIONS.contractWrite);
}

export async function createLegalCaseAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteLegal(session)) {
    return { error: "Você não tem permissão para gerenciar casos jurídicos." };
  }
  const candidate = {
    title: String(formData.get("title") ?? "").trim(),
    caseType: String(formData.get("caseType") ?? "contencioso"),
    status: String(formData.get("status") ?? "aberto"),
    priority: String(formData.get("priority") ?? "media"),
    counterparty: emptyToNull(formData.get("counterparty")),
    licenseeId: emptyToNull(formData.get("licenseeId")),
    brandId: emptyToNull(formData.get("brandId")),
    amountAtRisk: numOrZero(formData.get("amountAtRisk")),
    responsible: emptyToNull(formData.get("responsible")),
    forum: emptyToNull(formData.get("forum")),
    openedAt: emptyToNull(formData.get("openedAt")),
    dueDate: emptyToNull(formData.get("dueDate")),
    description: emptyToNull(formData.get("description")),
    notes: emptyToNull(formData.get("notes")),
  };
  const parsed = legalCaseSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input: LegalCaseInput = parsed.data;
  let id: string;
  try {
    id = (await createLegalCase(session.tenantId, input, session.userId)).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar o caso." };
  }
  await logAudit(
    session.tenantId,
    session.userId,
    "legal.case.create",
    "legal_case",
    id,
    `Caso "${input.title}" aberto`,
  );
  redirect(`/juridico/${id}`);
}

export async function setLegalCaseStatusAction(id: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!canWriteLegal(session)) return;
  const status = String(formData.get("status") ?? "");
  if (!(LEGAL_CASE_STATUS as readonly string[]).includes(status)) return;
  const { previous } = await setLegalCaseStatus(session.tenantId, id, status as LegalCaseStatus);
  await logAudit(
    session.tenantId,
    session.userId,
    "legal.case.status",
    "legal_case",
    id,
    `Status do caso → ${status}`,
    { before: { status: previous }, after: { status }, actorName: session.name },
  );
  revalidatePath(`/juridico/${id}`);
  revalidatePath("/juridico");
}

export async function addLegalEventAction(
  caseId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteLegal(session)) {
    return { error: "Você não tem permissão para registrar andamentos." };
  }
  const candidate = {
    eventType: String(formData.get("eventType") ?? "andamento"),
    description: String(formData.get("description") ?? "").trim(),
    occurredAt: emptyToNull(formData.get("occurredAt")),
  };
  const parsed = legalEventSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input: LegalEventInput = parsed.data;
  try {
    await addLegalEvent(session.tenantId, caseId, input, session.userId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar o andamento." };
  }
  await logAudit(
    session.tenantId,
    session.userId,
    "legal.case.event",
    "legal_case",
    caseId,
    `Andamento (${input.eventType}) registrado`,
  );
  revalidatePath(`/juridico/${caseId}`);
  return { error: null };
}
