import "server-only";
import { and, eq, desc, asc, sql, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { marketingCampaign, campaignActivation, brand, licensee } from "@/lib/db/schema";
import type { CampaignStatus, CampaignType, ActivationType } from "@/lib/db/schema";

export async function listCampaigns(
  tenantId: string,
  opts?: { status?: CampaignStatus; q?: string },
) {
  const conds = [eq(marketingCampaign.tenantId, tenantId)];
  if (opts?.status) conds.push(eq(marketingCampaign.status, opts.status));
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
      active: sql<string>`count(*) filter (where ${marketingCampaign.status} = 'ativa')`,
      planned: sql<string>`count(*) filter (where ${marketingCampaign.status} = 'planejamento')`,
      total: sql<string>`count(*)`,
    })
    .from(marketingCampaign)
    .where(eq(marketingCampaign.tenantId, tenantId));
  const budget = Number(r[0]?.budget ?? 0);
  const spent = Number(r[0]?.spent ?? 0);
  return {
    budget: r[0]?.budget ?? "0",
    spent: r[0]?.spent ?? "0",
    usage: budget > 0 ? Math.round((spent / budget) * 100) : 0,
    active: Number(r[0]?.active ?? 0),
    planned: Number(r[0]?.planned ?? 0),
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
      budget: marketingCampaign.budget,
      spent: marketingCampaign.spent,
      channel: marketingCampaign.channel,
      goal: marketingCampaign.goal,
      startDate: marketingCampaign.startDate,
      endDate: marketingCampaign.endDate,
      notes: marketingCampaign.notes,
      brandName: brand.name,
      licenseeName: licensee.legalName,
    })
    .from(marketingCampaign)
    .leftJoin(brand, eq(brand.id, marketingCampaign.brandId))
    .leftJoin(licensee, eq(licensee.id, marketingCampaign.licenseeId))
    .where(and(eq(marketingCampaign.id, id), eq(marketingCampaign.tenantId, tenantId)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;
  const activations = await db
    .select()
    .from(campaignActivation)
    .where(eq(campaignActivation.campaignId, id))
    .orderBy(asc(campaignActivation.scheduledAt));
  return { campaign: head, activations };
}

export type CampaignInput = {
  name: string;
  brandId: string | null;
  licenseeId: string | null;
  campaignType: CampaignType;
  status: CampaignStatus;
  budget: number;
  channel: string | null;
  goal: string | null;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
};

export async function createCampaign(
  tenantId: string,
  input: CampaignInput,
  userId: string,
): Promise<{ id: string }> {
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
      campaignType: input.campaignType,
      status: input.status,
      budget: input.budget.toFixed(2),
      channel: input.channel,
      goal: input.goal,
      startDate: input.startDate,
      endDate: input.endDate,
      notes: input.notes,
      createdBy: userId,
    })
    .returning({ id: marketingCampaign.id });
  return { id: inserted[0].id };
}

const CAMPAIGN_STATUS_VALUES = [
  "planejamento",
  "ativa",
  "pausada",
  "concluida",
  "cancelada",
] as const;

export async function setCampaignStatus(
  tenantId: string,
  id: string,
  status: CampaignStatus,
): Promise<void> {
  if (!(CAMPAIGN_STATUS_VALUES as readonly string[]).includes(status)) return;
  await db
    .update(marketingCampaign)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(marketingCampaign.id, id), eq(marketingCampaign.tenantId, tenantId)));
}

export type ActivationInput = {
  name: string;
  activationType: ActivationType;
  location: string | null;
  cost: number;
  scheduledAt: string | null;
  notes: string | null;
};

/** Adiciona uma ativação de trade e soma o custo ao gasto (spent) da campanha. */
export async function addActivation(
  tenantId: string,
  campaignId: string,
  input: ActivationInput,
  userId: string,
): Promise<void> {
  const c = await db
    .select({ id: marketingCampaign.id, spent: marketingCampaign.spent })
    .from(marketingCampaign)
    .where(and(eq(marketingCampaign.id, campaignId), eq(marketingCampaign.tenantId, tenantId)))
    .limit(1);
  if (!c[0]) throw new Error("Campanha não encontrada.");

  await db.insert(campaignActivation).values({
    tenantId,
    campaignId,
    name: input.name,
    activationType: input.activationType,
    location: input.location,
    cost: input.cost.toFixed(2),
    scheduledAt: input.scheduledAt,
    notes: input.notes,
    createdBy: userId,
  });

  const newSpent = Number(c[0].spent ?? 0) + input.cost;
  await db
    .update(marketingCampaign)
    .set({ spent: newSpent.toFixed(2), updatedAt: new Date() })
    .where(and(eq(marketingCampaign.id, campaignId), eq(marketingCampaign.tenantId, tenantId)));
}
