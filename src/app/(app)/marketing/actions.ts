"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  createCampaign,
  setCampaignStatus,
  addActivation,
  type CampaignInput,
  type ActivationInput,
} from "@/lib/data/marketing";
import { logAudit } from "@/lib/data/audit";
import { campaignSchema, activationSchema, CAMPAIGN_STATUS } from "./schema";
import type { CampaignStatus } from "@/lib/db/schema";

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

function canWriteMarketing(session: Parameters<typeof can>[0]) {
  return session.isInternal || can(session, PERMISSIONS.contractWrite);
}

export async function createCampaignAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteMarketing(session)) {
    return { error: "Você não tem permissão para gerenciar campanhas." };
  }
  const candidate = {
    name: String(formData.get("name") ?? "").trim(),
    brandId: emptyToNull(formData.get("brandId")),
    licenseeId: emptyToNull(formData.get("licenseeId")),
    campaignType: String(formData.get("campaignType") ?? "promocional"),
    status: String(formData.get("status") ?? "planejamento"),
    budget: numOrZero(formData.get("budget")),
    channel: emptyToNull(formData.get("channel")),
    goal: emptyToNull(formData.get("goal")),
    startDate: emptyToNull(formData.get("startDate")),
    endDate: emptyToNull(formData.get("endDate")),
    notes: emptyToNull(formData.get("notes")),
  };
  const parsed = campaignSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input: CampaignInput = parsed.data;
  let id: string;
  try {
    id = (await createCampaign(session.tenantId, input, session.userId)).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar a campanha." };
  }
  await logAudit(
    session.tenantId,
    session.userId,
    "campaign.create",
    "marketing_campaign",
    id,
    `Campanha "${input.name}" criada`,
  );
  redirect(`/marketing/${id}`);
}

export async function setCampaignStatusAction(id: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!canWriteMarketing(session)) return;
  const status = String(formData.get("status") ?? "");
  if (!(CAMPAIGN_STATUS as readonly string[]).includes(status)) return;
  const { previous } = await setCampaignStatus(session.tenantId, id, status as CampaignStatus);
  await logAudit(
    session.tenantId,
    session.userId,
    "campaign.status",
    "marketing_campaign",
    id,
    `Status da campanha → ${status}`,
    { before: { status: previous }, after: { status }, actorName: session.name },
  );
  revalidatePath(`/marketing/${id}`);
  revalidatePath("/marketing");
}

export async function addActivationAction(
  campaignId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteMarketing(session)) {
    return { error: "Você não tem permissão para registrar ativações." };
  }
  const candidate = {
    name: String(formData.get("name") ?? "").trim(),
    activationType: String(formData.get("activationType") ?? "pdv"),
    location: emptyToNull(formData.get("location")),
    cost: numOrZero(formData.get("cost")),
    scheduledAt: emptyToNull(formData.get("scheduledAt")),
    notes: emptyToNull(formData.get("notes")),
  };
  const parsed = activationSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input: ActivationInput = parsed.data;
  try {
    await addActivation(session.tenantId, campaignId, input, session.userId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar a ativação." };
  }
  await logAudit(
    session.tenantId,
    session.userId,
    "campaign.activation",
    "marketing_campaign",
    campaignId,
    `Ativação "${input.name}" (${input.activationType})`,
  );
  revalidatePath(`/marketing/${campaignId}`);
  return { error: null };
}
