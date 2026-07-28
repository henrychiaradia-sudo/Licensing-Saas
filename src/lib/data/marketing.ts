import "server-only";
import { and, eq, desc, asc, sql, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  marketingCampaign,
  marketingAction,
  marketingKpi,
  marketingPlan,
  marketingAgency,
  marketingInfluencer,
  brand,
  licensee,
} from "@/lib/db/schema";
import type {
  CampaignStatus,
  CampaignType,
  MarketingActionType,
  MarketingActionStatus,
} from "@/lib/db/schema";

/** ROI% = (retorno − investimento) / investimento × 100. */
export function roiPct(spent: number, revenue: number): number | null {
  if (!spent || spent <= 0) return null;
  return ((revenue - spent) / spent) * 100;
}

/* ============================ CAMPANHAS ============================ */

export async function listCampaigns(
  tenantId: string,
  opts?: { status?: CampaignStatus; q?: string; planId?: string },
) {
  const conds = [eq(marketingCampaign.tenantId, tenantId)];
  if (opts?.status) conds.push(eq(marketingCampaign.status, opts.status));
  if (opts?.planId) conds.push(eq(marketingCampaign.planId, opts.planId));
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const m = or(ilike(marketingCampaign.campaignNumber, term), ilike(marketingCampaign.name, term));
    if (m) conds.push(m);
  }
  return db
    .select({
      id: marketingCampaign.id,
      campaignNumber: marketingCampaign.campaignNumber,
      name: marketingCampaign.name,
      campaignType: marketingCampaign.campaignType,
      status: marketingCampaign.status,
      budget: marketingCampaign.budget,
      spent: marketingCampaign.spent,
      revenue: marketingCampaign.revenue,
      channel: marketingCampaign.channel,
      coop: marketingCampaign.coop,
      startDate: marketingCampaign.startDate,
      endDate: marketingCampaign.endDate,
      brandName: brand.name,
    })
    .from(marketingCampaign)
    .leftJoin(brand, eq(brand.id, marketingCampaign.brandId))
    .where(and(...conds))
    .orderBy(desc(marketingCampaign.createdAt))
    .limit(300);
}

export async function marketingSummary(tenantId: string) {
  const r = await db
    .select({
      budget: sql<string>`coalesce(sum(${marketingCampaign.budget}), 0)`,
      spent: sql<string>`coalesce(sum(${marketingCampaign.spent}), 0)`,
      revenue: sql<string>`coalesce(sum(${marketingCampaign.revenue}), 0)`,
      active: sql<string>`count(*) filter (where ${marketingCampaign.status} = 'ativa')`,
      total: sql<string>`count(*)`,
    })
    .from(marketingCampaign)
    .where(eq(marketingCampaign.tenantId, tenantId));
  const budget = Number(r[0]?.budget ?? 0);
  const spent = Number(r[0]?.spent ?? 0);
  const revenue = Number(r[0]?.revenue ?? 0);
  return {
    budget,
    spent,
    revenue,
    usage: budget > 0 ? Math.round((spent / budget) * 100) : 0,
    roi: roiPct(spent, revenue),
    active: Number(r[0]?.active ?? 0),
    total: Number(r[0]?.total ?? 0),
  };
}

export async function getCampaignDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: marketingCampaign.id,
      campaignNumber: marketingCampaign.campaignNumber,
      name: marketingCampaign.name,
      campaignType: marketingCampaign.campaignType,
      status: marketingCampaign.status,
      planId: marketingCampaign.planId,
      brandId: marketingCampaign.brandId,
      licenseeId: marketingCampaign.licenseeId,
      budget: marketingCampaign.budget,
      spent: marketingCampaign.spent,
      revenue: marketingCampaign.revenue,
      channel: marketingCampaign.channel,
      goal: marketingCampaign.goal,
      publico: marketingCampaign.publico,
      territorio: marketingCampaign.territorio,
      coop: marketingCampaign.coop,
      startDate: marketingCampaign.startDate,
      endDate: marketingCampaign.endDate,
      notes: marketingCampaign.notes,
      brandName: brand.name,
      licenseeName: licensee.legalName,
      planName: marketingPlan.name,
    })
    .from(marketingCampaign)
    .leftJoin(brand, eq(brand.id, marketingCampaign.brandId))
    .leftJoin(licensee, eq(licensee.id, marketingCampaign.licenseeId))
    .leftJoin(marketingPlan, eq(marketingPlan.id, marketingCampaign.planId))
    .where(and(eq(marketingCampaign.id, id), eq(marketingCampaign.tenantId, tenantId)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;
  const actions = await listActions(tenantId, { campaignId: id });
  const kpis = await db
    .select()
    .from(marketingKpi)
    .where(eq(marketingKpi.campaignId, id))
    .orderBy(asc(marketingKpi.createdAt));
  return { campaign: head, actions, kpis };
}

export type CampaignInput = {
  name: string;
  brandId: string | null;
  licenseeId: string | null;
  planId: string | null;
  campaignType: CampaignType;
  status: CampaignStatus;
  budget: number;
  channel: string | null;
  goal: string | null;
  publico: string | null;
  territorio: string | null;
  coop: boolean;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
};

export async function createCampaign(tenantId: string, input: CampaignInput, userId: string) {
  const cnt = await db
    .select({ c: sql<string>`count(*)` })
    .from(marketingCampaign)
    .where(eq(marketingCampaign.tenantId, tenantId));
  const year = new Date().toISOString().slice(0, 4);
  const campaignNumber = `MKT-${year}-${String(Number(cnt[0]?.c ?? 0) + 1).padStart(4, "0")}`;
  const inserted = await db
    .insert(marketingCampaign)
    .values({
      tenantId,
      campaignNumber,
      name: input.name,
      brandId: input.brandId,
      licenseeId: input.licenseeId,
      planId: input.planId,
      campaignType: input.campaignType,
      status: input.status,
      budget: input.budget.toFixed(2),
      channel: input.channel,
      goal: input.goal,
      publico: input.publico,
      territorio: input.territorio,
      coop: input.coop,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes,
      createdBy: userId,
    })
    .returning({ id: marketingCampaign.id });
  return { id: inserted[0].id };
}

export async function updateCampaign(tenantId: string, id: string, input: CampaignInput) {
  await db
    .update(marketingCampaign)
    .set({
      name: input.name,
      brandId: input.brandId,
      licenseeId: input.licenseeId,
      planId: input.planId,
      campaignType: input.campaignType,
      status: input.status,
      budget: input.budget.toFixed(2),
      channel: input.channel,
      goal: input.goal,
      publico: input.publico,
      territorio: input.territorio,
      coop: input.coop,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes,
      updatedAt: new Date(),
    })
    .where(and(eq(marketingCampaign.id, id), eq(marketingCampaign.tenantId, tenantId)));
}

export async function setCampaignStatus(
  tenantId: string,
  id: string,
  status: CampaignStatus,
): Promise<{ previous: string | null }> {
  const prev = await db
    .select({ status: marketingCampaign.status })
    .from(marketingCampaign)
    .where(and(eq(marketingCampaign.id, id), eq(marketingCampaign.tenantId, tenantId)))
    .limit(1);
  await db
    .update(marketingCampaign)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(marketingCampaign.id, id), eq(marketingCampaign.tenantId, tenantId)));
  return { previous: prev[0]?.status ?? null };
}

/** Recalcula realizado (spent) e retorno (revenue) da campanha a partir das ações. */
export async function recomputeCampaignTotals(tenantId: string, campaignId: string) {
  const r = await db
    .select({
      spent: sql<string>`coalesce(sum(${marketingAction.spent}), 0)`,
      revenue: sql<string>`coalesce(sum(${marketingAction.revenue}), 0)`,
    })
    .from(marketingAction)
    .where(and(eq(marketingAction.campaignId, campaignId), eq(marketingAction.tenantId, tenantId)));
  await db
    .update(marketingCampaign)
    .set({
      spent: (r[0]?.spent ?? "0"),
      revenue: (r[0]?.revenue ?? "0"),
      updatedAt: new Date(),
    })
    .where(and(eq(marketingCampaign.id, campaignId), eq(marketingCampaign.tenantId, tenantId)));
}

/* ============================ AÇÕES ============================ */

export async function listActions(
  tenantId: string,
  opts?: { type?: MarketingActionType; status?: MarketingActionStatus; campaignId?: string; q?: string },
) {
  const conds = [eq(marketingAction.tenantId, tenantId)];
  if (opts?.type) conds.push(eq(marketingAction.actionType, opts.type));
  if (opts?.status) conds.push(eq(marketingAction.status, opts.status));
  if (opts?.campaignId) conds.push(eq(marketingAction.campaignId, opts.campaignId));
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const m = or(ilike(marketingAction.name, term), ilike(marketingAction.channel, term));
    if (m) conds.push(m);
  }
  return db
    .select({
      id: marketingAction.id,
      name: marketingAction.name,
      actionType: marketingAction.actionType,
      status: marketingAction.status,
      channel: marketingAction.channel,
      territorio: marketingAction.territorio,
      budget: marketingAction.budget,
      spent: marketingAction.spent,
      revenue: marketingAction.revenue,
      reachActual: marketingAction.reachActual,
      coop: marketingAction.coop,
      startDate: marketingAction.startDate,
      endDate: marketingAction.endDate,
      evidenceUrl: marketingAction.evidenceUrl,
      campaignId: marketingAction.campaignId,
      campaignName: marketingCampaign.name,
      agencyName: marketingAgency.name,
      influencerName: marketingInfluencer.name,
    })
    .from(marketingAction)
    .leftJoin(marketingCampaign, eq(marketingCampaign.id, marketingAction.campaignId))
    .leftJoin(marketingAgency, eq(marketingAgency.id, marketingAction.agencyId))
    .leftJoin(marketingInfluencer, eq(marketingInfluencer.id, marketingAction.influencerId))
    .where(and(...conds))
    .orderBy(desc(marketingAction.startDate), desc(marketingAction.createdAt))
    .limit(400);
}

export async function getActionDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: marketingAction.id,
      name: marketingAction.name,
      actionType: marketingAction.actionType,
      status: marketingAction.status,
      channel: marketingAction.channel,
      territorio: marketingAction.territorio,
      budget: marketingAction.budget,
      spent: marketingAction.spent,
      revenue: marketingAction.revenue,
      reachTarget: marketingAction.reachTarget,
      reachActual: marketingAction.reachActual,
      coop: marketingAction.coop,
      location: marketingAction.location,
      startDate: marketingAction.startDate,
      endDate: marketingAction.endDate,
      evidenceUrl: marketingAction.evidenceUrl,
      resultNotes: marketingAction.resultNotes,
      notes: marketingAction.notes,
      campaignId: marketingAction.campaignId,
      agencyId: marketingAction.agencyId,
      influencerId: marketingAction.influencerId,
      planId: marketingAction.planId,
      campaignName: marketingCampaign.name,
      agencyName: marketingAgency.name,
      influencerName: marketingInfluencer.name,
    })
    .from(marketingAction)
    .leftJoin(marketingCampaign, eq(marketingCampaign.id, marketingAction.campaignId))
    .leftJoin(marketingAgency, eq(marketingAgency.id, marketingAction.agencyId))
    .leftJoin(marketingInfluencer, eq(marketingInfluencer.id, marketingAction.influencerId))
    .where(and(eq(marketingAction.id, id), eq(marketingAction.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

export type ActionInput = {
  name: string;
  actionType: MarketingActionType;
  status: MarketingActionStatus;
  campaignId: string | null;
  channel: string | null;
  territorio: string | null;
  agencyId: string | null;
  influencerId: string | null;
  budget: number;
  spent: number;
  revenue: number;
  reachTarget: number | null;
  reachActual: number | null;
  coop: boolean;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  evidenceUrl: string | null;
  resultNotes: string | null;
  notes: string | null;
};

export async function createAction(tenantId: string, input: ActionInput, userId: string) {
  const inserted = await db
    .insert(marketingAction)
    .values({
      tenantId,
      campaignId: input.campaignId,
      name: input.name,
      actionType: input.actionType,
      status: input.status,
      channel: input.channel,
      territorio: input.territorio,
      agencyId: input.agencyId,
      influencerId: input.influencerId,
      budget: input.budget.toFixed(2),
      spent: input.spent.toFixed(2),
      revenue: input.revenue.toFixed(2),
      reachTarget: input.reachTarget,
      reachActual: input.reachActual,
      coop: input.coop,
      location: input.location,
      startDate: input.startDate,
      endDate: input.endDate,
      evidenceUrl: input.evidenceUrl,
      resultNotes: input.resultNotes,
      notes: input.notes,
      createdBy: userId,
    })
    .returning({ id: marketingAction.id });
  if (input.campaignId) await recomputeCampaignTotals(tenantId, input.campaignId);
  return { id: inserted[0].id };
}

export async function updateAction(tenantId: string, id: string, input: ActionInput) {
  const cur = await db
    .select({ campaignId: marketingAction.campaignId })
    .from(marketingAction)
    .where(and(eq(marketingAction.id, id), eq(marketingAction.tenantId, tenantId)))
    .limit(1);
  await db
    .update(marketingAction)
    .set({
      campaignId: input.campaignId,
      name: input.name,
      actionType: input.actionType,
      status: input.status,
      channel: input.channel,
      territorio: input.territorio,
      agencyId: input.agencyId,
      influencerId: input.influencerId,
      budget: input.budget.toFixed(2),
      spent: input.spent.toFixed(2),
      revenue: input.revenue.toFixed(2),
      reachTarget: input.reachTarget,
      reachActual: input.reachActual,
      coop: input.coop,
      location: input.location,
      startDate: input.startDate,
      endDate: input.endDate,
      evidenceUrl: input.evidenceUrl,
      resultNotes: input.resultNotes,
      notes: input.notes,
      updatedAt: new Date(),
    })
    .where(and(eq(marketingAction.id, id), eq(marketingAction.tenantId, tenantId)));
  const oldCampaign = cur[0]?.campaignId ?? null;
  if (oldCampaign) await recomputeCampaignTotals(tenantId, oldCampaign);
  if (input.campaignId && input.campaignId !== oldCampaign)
    await recomputeCampaignTotals(tenantId, input.campaignId);
}

/* ============================ KPIs ============================ */

export type KpiInput = { name: string; target: number | null; realized: number; unit: string | null };

export async function addKpi(tenantId: string, campaignId: string, input: KpiInput, userId: string) {
  await db.insert(marketingKpi).values({
    tenantId,
    campaignId,
    name: input.name,
    target: input.target != null ? input.target.toFixed(2) : null,
    realized: input.realized.toFixed(2),
    unit: input.unit,
    createdBy: userId,
  });
}
