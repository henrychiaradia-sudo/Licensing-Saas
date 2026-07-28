import "server-only";
import { and, eq, desc, asc, sql, or, ilike, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  marketingPlan,
  marketingCampaign,
  marketingAction,
  brand,
  licensee,
} from "@/lib/db/schema";
import type { MarketingPlanStatus } from "@/lib/db/schema";

/* ============================ PLANOS DE MARKETING ============================ */

export async function listPlans(
  tenantId: string,
  opts?: { status?: MarketingPlanStatus; q?: string; year?: number },
) {
  const conds = [eq(marketingPlan.tenantId, tenantId)];
  if (opts?.status) conds.push(eq(marketingPlan.status, opts.status));
  if (opts?.year) conds.push(eq(marketingPlan.year, opts.year));
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const m = or(ilike(marketingPlan.planNumber, term), ilike(marketingPlan.name, term));
    if (m) conds.push(m);
  }
  // Realizado por plano = gasto das campanhas do plano + gasto das ações ligadas direto ao plano (sem campanha).
  const campSpent = sql<string>`(
    select coalesce(sum(c.spent), 0) from marketing_campaign c
    where c.plan_id = ${marketingPlan.id} and c.tenant_id = ${tenantId}
  )`;
  const actSpent = sql<string>`(
    select coalesce(sum(a.spent), 0) from marketing_action a
    where a.plan_id = ${marketingPlan.id} and a.campaign_id is null and a.tenant_id = ${tenantId}
  )`;
  return db
    .select({
      id: marketingPlan.id,
      planNumber: marketingPlan.planNumber,
      name: marketingPlan.name,
      year: marketingPlan.year,
      status: marketingPlan.status,
      budget: marketingPlan.budget,
      territorio: marketingPlan.territorio,
      startDate: marketingPlan.startDate,
      endDate: marketingPlan.endDate,
      brandName: brand.name,
      licenseeName: licensee.legalName,
      realized: sql<string>`(${campSpent} + ${actSpent})`,
    })
    .from(marketingPlan)
    .leftJoin(brand, eq(brand.id, marketingPlan.brandId))
    .leftJoin(licensee, eq(licensee.id, marketingPlan.licenseeId))
    .where(and(...conds))
    .orderBy(desc(marketingPlan.year), desc(marketingPlan.createdAt))
    .limit(200);
}

export async function plansSummary(tenantId: string) {
  const r = await db
    .select({
      total: sql<string>`count(*)`,
      approved: sql<string>`count(*) filter (where ${marketingPlan.status} in ('aprovado','em_execucao'))`,
      budget: sql<string>`coalesce(sum(${marketingPlan.budget}), 0)`,
    })
    .from(marketingPlan)
    .where(eq(marketingPlan.tenantId, tenantId));
  return {
    total: Number(r[0]?.total ?? 0),
    approved: Number(r[0]?.approved ?? 0),
    budget: Number(r[0]?.budget ?? 0),
  };
}

export async function getPlanDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: marketingPlan.id,
      planNumber: marketingPlan.planNumber,
      name: marketingPlan.name,
      year: marketingPlan.year,
      status: marketingPlan.status,
      brandId: marketingPlan.brandId,
      licenseeId: marketingPlan.licenseeId,
      objetivo: marketingPlan.objetivo,
      publico: marketingPlan.publico,
      territorio: marketingPlan.territorio,
      budget: marketingPlan.budget,
      startDate: marketingPlan.startDate,
      endDate: marketingPlan.endDate,
      notes: marketingPlan.notes,
      brandName: brand.name,
      licenseeName: licensee.legalName,
    })
    .from(marketingPlan)
    .leftJoin(brand, eq(brand.id, marketingPlan.brandId))
    .leftJoin(licensee, eq(licensee.id, marketingPlan.licenseeId))
    .where(and(eq(marketingPlan.id, id), eq(marketingPlan.tenantId, tenantId)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;

  const campaigns = await db
    .select({
      id: marketingCampaign.id,
      campaignNumber: marketingCampaign.campaignNumber,
      name: marketingCampaign.name,
      status: marketingCampaign.status,
      budget: marketingCampaign.budget,
      spent: marketingCampaign.spent,
      revenue: marketingCampaign.revenue,
    })
    .from(marketingCampaign)
    .where(and(eq(marketingCampaign.planId, id), eq(marketingCampaign.tenantId, tenantId)))
    .orderBy(desc(marketingCampaign.createdAt));

  // Ações ligadas ao plano direto (sem campanha) — as demais aparecem via campanha.
  const looseActions = await db
    .select({
      id: marketingAction.id,
      name: marketingAction.name,
      actionType: marketingAction.actionType,
      status: marketingAction.status,
      budget: marketingAction.budget,
      spent: marketingAction.spent,
      revenue: marketingAction.revenue,
      startDate: marketingAction.startDate,
    })
    .from(marketingAction)
    .where(
      and(
        eq(marketingAction.planId, id),
        isNull(marketingAction.campaignId),
        eq(marketingAction.tenantId, tenantId),
      ),
    )
    .orderBy(desc(marketingAction.startDate));

  const campSpent = campaigns.reduce((s, c) => s + Number(c.spent), 0);
  const campRevenue = campaigns.reduce((s, c) => s + Number(c.revenue), 0);
  const looseSpent = looseActions.reduce((s, a) => s + Number(a.spent), 0);
  const looseRevenue = looseActions.reduce((s, a) => s + Number(a.revenue), 0);
  const realized = campSpent + looseSpent;
  const revenue = campRevenue + looseRevenue;

  return {
    plan: head,
    campaigns,
    looseActions,
    rollup: {
      budget: Number(head.budget),
      realized,
      revenue,
      usage: Number(head.budget) > 0 ? Math.round((realized / Number(head.budget)) * 100) : 0,
    },
  };
}

export type PlanInput = {
  name: string;
  year: number | null;
  brandId: string | null;
  licenseeId: string | null;
  objetivo: string | null;
  publico: string | null;
  territorio: string | null;
  budget: number;
  status: MarketingPlanStatus;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
};

export async function createPlan(tenantId: string, input: PlanInput, userId: string) {
  const cnt = await db
    .select({ c: sql<string>`count(*)` })
    .from(marketingPlan)
    .where(eq(marketingPlan.tenantId, tenantId));
  const year = String(input.year ?? new Date().getFullYear());
  const planNumber = `PLM-${year}-${String(Number(cnt[0]?.c ?? 0) + 1).padStart(4, "0")}`;
  const inserted = await db
    .insert(marketingPlan)
    .values({
      tenantId,
      planNumber,
      name: input.name,
      year: input.year,
      brandId: input.brandId,
      licenseeId: input.licenseeId,
      objetivo: input.objetivo,
      publico: input.publico,
      territorio: input.territorio,
      budget: input.budget.toFixed(2),
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes,
      createdBy: userId,
    })
    .returning({ id: marketingPlan.id });
  return { id: inserted[0].id };
}

export async function updatePlan(tenantId: string, id: string, input: PlanInput) {
  await db
    .update(marketingPlan)
    .set({
      name: input.name,
      year: input.year,
      brandId: input.brandId,
      licenseeId: input.licenseeId,
      objetivo: input.objetivo,
      publico: input.publico,
      territorio: input.territorio,
      budget: input.budget.toFixed(2),
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes,
      updatedAt: new Date(),
    })
    .where(and(eq(marketingPlan.id, id), eq(marketingPlan.tenantId, tenantId)));
}

export async function setPlanStatus(
  tenantId: string,
  id: string,
  status: MarketingPlanStatus,
): Promise<{ previous: string | null }> {
  const prev = await db
    .select({ status: marketingPlan.status })
    .from(marketingPlan)
    .where(and(eq(marketingPlan.id, id), eq(marketingPlan.tenantId, tenantId)))
    .limit(1);
  await db
    .update(marketingPlan)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(marketingPlan.id, id), eq(marketingPlan.tenantId, tenantId)));
  return { previous: prev[0]?.status ?? null };
}

/** Opções de planos para selects (id + rótulo). */
export async function listPlanOptions(tenantId: string) {
  return db
    .select({
      id: marketingPlan.id,
      planNumber: marketingPlan.planNumber,
      name: marketingPlan.name,
    })
    .from(marketingPlan)
    .where(eq(marketingPlan.tenantId, tenantId))
    .orderBy(asc(marketingPlan.name));
}
