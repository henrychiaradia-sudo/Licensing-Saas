"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  createOpportunity,
  setOpportunityStage,
  addOpportunityActivity,
  convertOpportunity,
  type OpportunityInput,
} from "@/lib/data/opportunities";
import { logAudit } from "@/lib/data/audit";
import { opportunitySchema, activitySchema, OPPORTUNITY_STAGE } from "./schema";
import type { OpportunityStage } from "@/lib/db/schema";

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

function canWritePipeline(session: Parameters<typeof can>[0]) {
  return session.isInternal || can(session, PERMISSIONS.contractWrite);
}

export async function createOpportunityAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!canWritePipeline(session)) {
    return { error: "Você não tem permissão para gerenciar o pipeline." };
  }

  const candidate = {
    name: String(formData.get("name") ?? "").trim(),
    companyName: emptyToNull(formData.get("companyName")),
    contactName: emptyToNull(formData.get("contactName")),
    contactEmail: emptyToNull(formData.get("contactEmail")),
    contactPhone: emptyToNull(formData.get("contactPhone")),
    brandId: emptyToNull(formData.get("brandId")),
    segmentId: emptyToNull(formData.get("segmentId")),
    stage: String(formData.get("stage") ?? "prospeccao"),
    estimatedValue: numOrZero(formData.get("estimatedValue")),
    source: emptyToNull(formData.get("source")),
    expectedCloseDate: emptyToNull(formData.get("expectedCloseDate")),
    ownerUserId: emptyToNull(formData.get("ownerUserId")),
    notes: emptyToNull(formData.get("notes")),
  };

  const parsed = opportunitySchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input: OpportunityInput = parsed.data;

  let id: string;
  try {
    id = (await createOpportunity(session.tenantId, input, session.userId)).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar a oportunidade." };
  }

  await logAudit(
    session.tenantId,
    session.userId,
    "opportunity.create",
    "licensing_opportunity",
    id,
    `Oportunidade "${input.name}" criada`,
  );

  redirect(`/pipeline/${id}`);
}

export async function setStageAction(id: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!canWritePipeline(session)) return;
  const stage = String(formData.get("stage") ?? "");
  const lostReason = emptyToNull(formData.get("lostReason"));
  if (!(OPPORTUNITY_STAGE as readonly string[]).includes(stage)) return;
  await setOpportunityStage(session.tenantId, id, stage as OpportunityStage, lostReason);
  await logAudit(
    session.tenantId,
    session.userId,
    "opportunity.stage",
    "licensing_opportunity",
    id,
    `Estágio → ${stage}`,
  );
  revalidatePath(`/pipeline/${id}`);
  revalidatePath("/pipeline");
}

export async function addActivityAction(
  opportunityId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!canWritePipeline(session)) {
    return { error: "Você não tem permissão para registrar interações." };
  }
  const candidate = {
    activityType: String(formData.get("activityType") ?? "nota"),
    description: String(formData.get("description") ?? "").trim(),
  };
  const parsed = activitySchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  try {
    await addOpportunityActivity(
      session.tenantId,
      opportunityId,
      parsed.data.activityType,
      parsed.data.description,
      session.userId,
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar a interação." };
  }
  revalidatePath(`/pipeline/${opportunityId}`);
  return { error: null };
}

export async function convertAction(id: string): Promise<void> {
  const session = await requireSession();
  if (!canWritePipeline(session)) return;
  const { licenseeId } = await convertOpportunity(session.tenantId, id, session.userId);
  await logAudit(
    session.tenantId,
    session.userId,
    "opportunity.convert",
    "licensing_opportunity",
    id,
    "Oportunidade convertida em licenciado",
  );
  revalidatePath(`/pipeline/${id}`);
  revalidatePath("/licenciados");
  redirect(`/licenciados/${licenseeId}`);
}
