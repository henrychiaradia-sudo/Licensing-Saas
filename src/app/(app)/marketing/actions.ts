"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  createCampaign,
  updateCampaign,
  setCampaignStatus,
  createAction,
  updateAction,
  addKpi,
  type CampaignInput,
  type ActionInput,
  type KpiInput,
} from "@/lib/data/marketing";
import {
  createPlan,
  updatePlan,
  setPlanStatus,
  type PlanInput,
} from "@/lib/data/marketing-plans";
import {
  createAgency,
  createInfluencer,
  type AgencyInput,
  type InfluencerInput,
} from "@/lib/data/marketing-registry";
import { logAudit } from "@/lib/data/audit";
import {
  campaignSchema,
  actionSchema,
  kpiSchema,
  planSchema,
  agencySchema,
  influencerSchema,
  CAMPAIGN_STATUS,
  PLAN_STATUS,
} from "./schema";
import type { CampaignStatus, MarketingPlanStatus } from "@/lib/db/schema";

export type FormState = { error: string | null };

/* -------------------------------- helpers -------------------------------- */
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
function numOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  let s = String(v).trim();
  if (s === "") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function intOrNull(v: FormDataEntryValue | null): number | null {
  const n = numOrNull(v);
  return n == null ? null : Math.round(n);
}
function boolFrom(v: FormDataEntryValue | null): boolean {
  const s = v == null ? "" : String(v);
  return s === "on" || s === "true" || s === "1";
}
function canWriteMarketing(session: Parameters<typeof can>[0]) {
  return session.isInternal || can(session, PERMISSIONS.contractWrite);
}

/* ============================ CAMPANHAS ============================ */

function readCampaign(formData: FormData) {
  return campaignSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    brandId: emptyToNull(formData.get("brandId")),
    licenseeId: emptyToNull(formData.get("licenseeId")),
    planId: emptyToNull(formData.get("planId")),
    campaignType: String(formData.get("campaignType") ?? "promocional"),
    status: String(formData.get("status") ?? "planejamento"),
    budget: numOrZero(formData.get("budget")),
    channel: emptyToNull(formData.get("channel")),
    goal: emptyToNull(formData.get("goal")),
    publico: emptyToNull(formData.get("publico")),
    territorio: emptyToNull(formData.get("territorio")),
    coop: boolFrom(formData.get("coop")),
    startDate: emptyToNull(formData.get("startDate")),
    endDate: emptyToNull(formData.get("endDate")),
    notes: emptyToNull(formData.get("notes")),
  });
}

export async function createCampaignAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteMarketing(session)) return { error: "Você não tem permissão para gerenciar campanhas." };
  const parsed = readCampaign(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const input: CampaignInput = parsed.data;
  let id: string;
  try {
    id = (await createCampaign(session.tenantId, input, session.userId)).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar a campanha." };
  }
  await logAudit(session.tenantId, session.userId, "campaign.create", "marketing_campaign", id, `Campanha "${input.name}" criada`);
  redirect(`/marketing/campanhas/${id}`);
}

export async function updateCampaignAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteMarketing(session)) return { error: "Sem permissão." };
  const parsed = readCampaign(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    await updateCampaign(session.tenantId, id, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar." };
  }
  await logAudit(session.tenantId, session.userId, "campaign.update", "marketing_campaign", id, `Campanha "${parsed.data.name}" atualizada`);
  redirect(`/marketing/campanhas/${id}`);
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
  revalidatePath(`/marketing/campanhas/${id}`);
  revalidatePath("/marketing/campanhas");
}

/* ============================ AÇÕES ============================ */

function readAction(formData: FormData) {
  return actionSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    actionType: String(formData.get("actionType") ?? "ativacao"),
    status: String(formData.get("status") ?? "planejada"),
    campaignId: emptyToNull(formData.get("campaignId")),
    channel: emptyToNull(formData.get("channel")),
    territorio: emptyToNull(formData.get("territorio")),
    agencyId: emptyToNull(formData.get("agencyId")),
    influencerId: emptyToNull(formData.get("influencerId")),
    budget: numOrZero(formData.get("budget")),
    spent: numOrZero(formData.get("spent")),
    revenue: numOrZero(formData.get("revenue")),
    reachTarget: intOrNull(formData.get("reachTarget")),
    reachActual: intOrNull(formData.get("reachActual")),
    coop: boolFrom(formData.get("coop")),
    location: emptyToNull(formData.get("location")),
    startDate: emptyToNull(formData.get("startDate")),
    endDate: emptyToNull(formData.get("endDate")),
    evidenceUrl: emptyToNull(formData.get("evidenceUrl")),
    resultNotes: emptyToNull(formData.get("resultNotes")),
    notes: emptyToNull(formData.get("notes")),
  });
}

export async function createActionAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteMarketing(session)) return { error: "Sem permissão para registrar ações." };
  const parsed = readAction(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const input: ActionInput = parsed.data;
  let id: string;
  try {
    id = (await createAction(session.tenantId, input, session.userId)).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar a ação." };
  }
  await logAudit(session.tenantId, session.userId, "action.create", "marketing_action", id, `Ação "${input.name}" (${input.actionType})`);
  redirect(`/marketing/acoes/${id}`);
}

export async function updateActionAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteMarketing(session)) return { error: "Sem permissão." };
  const parsed = readAction(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    await updateAction(session.tenantId, id, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar." };
  }
  await logAudit(session.tenantId, session.userId, "action.update", "marketing_action", id, `Ação "${parsed.data.name}" atualizada`);
  redirect(`/marketing/acoes/${id}`);
}

/* ============================ KPIs ============================ */

export async function addKpiAction(campaignId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteMarketing(session)) return { error: "Sem permissão." };
  const parsed = kpiSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    target: numOrNull(formData.get("target")),
    realized: numOrZero(formData.get("realized")),
    unit: emptyToNull(formData.get("unit")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const input: KpiInput = parsed.data;
  try {
    await addKpi(session.tenantId, campaignId, input, session.userId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível adicionar o KPI." };
  }
  revalidatePath(`/marketing/campanhas/${campaignId}`);
  return { error: null };
}

/* ============================ PLANOS ============================ */

function readPlan(formData: FormData) {
  return planSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    year: intOrNull(formData.get("year")),
    brandId: emptyToNull(formData.get("brandId")),
    licenseeId: emptyToNull(formData.get("licenseeId")),
    objetivo: emptyToNull(formData.get("objetivo")),
    publico: emptyToNull(formData.get("publico")),
    territorio: emptyToNull(formData.get("territorio")),
    budget: numOrZero(formData.get("budget")),
    status: String(formData.get("status") ?? "rascunho"),
    startDate: emptyToNull(formData.get("startDate")),
    endDate: emptyToNull(formData.get("endDate")),
    notes: emptyToNull(formData.get("notes")),
  });
}

export async function createPlanAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteMarketing(session)) return { error: "Sem permissão para gerenciar planos." };
  const parsed = readPlan(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const input: PlanInput = parsed.data;
  let id: string;
  try {
    id = (await createPlan(session.tenantId, input, session.userId)).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar o plano." };
  }
  await logAudit(session.tenantId, session.userId, "plan.create", "marketing_plan", id, `Plano "${input.name}" criado`);
  redirect(`/marketing/planos/${id}`);
}

export async function updatePlanAction(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteMarketing(session)) return { error: "Sem permissão." };
  const parsed = readPlan(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    await updatePlan(session.tenantId, id, parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar." };
  }
  await logAudit(session.tenantId, session.userId, "plan.update", "marketing_plan", id, `Plano "${parsed.data.name}" atualizado`);
  redirect(`/marketing/planos/${id}`);
}

export async function setPlanStatusAction(id: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!canWriteMarketing(session)) return;
  const status = String(formData.get("status") ?? "");
  if (!(PLAN_STATUS as readonly string[]).includes(status)) return;
  const { previous } = await setPlanStatus(session.tenantId, id, status as MarketingPlanStatus);
  await logAudit(
    session.tenantId,
    session.userId,
    "plan.status",
    "marketing_plan",
    id,
    `Status do plano → ${status}`,
    { before: { status: previous }, after: { status }, actorName: session.name },
  );
  revalidatePath(`/marketing/planos/${id}`);
  revalidatePath("/marketing/planos");
}

/* ============================ AGÊNCIAS ============================ */

export async function createAgencyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteMarketing(session)) return { error: "Sem permissão." };
  const parsed = agencySchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    agencyType: String(formData.get("agencyType") ?? "outro"),
    contactName: emptyToNull(formData.get("contactName")),
    email: emptyToNull(formData.get("email")),
    phone: emptyToNull(formData.get("phone")),
    notes: emptyToNull(formData.get("notes")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const input: AgencyInput = { ...parsed.data, email: parsed.data.email || null };
  try {
    await createAgency(session.tenantId, input, session.userId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível cadastrar a agência." };
  }
  revalidatePath("/marketing/agencias");
  return { error: null };
}

/* ============================ INFLUENCIADORES ============================ */

export async function createInfluencerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteMarketing(session)) return { error: "Sem permissão." };
  const parsed = influencerSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    handle: emptyToNull(formData.get("handle")),
    platform: emptyToNull(formData.get("platform")),
    followers: intOrNull(formData.get("followers")),
    fee: numOrNull(formData.get("fee")),
    segment: emptyToNull(formData.get("segment")),
    notes: emptyToNull(formData.get("notes")),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const input: InfluencerInput = parsed.data;
  try {
    await createInfluencer(session.tenantId, input, session.userId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível cadastrar o influenciador." };
  }
  revalidatePath("/marketing/influenciadores");
  return { error: null };
}
