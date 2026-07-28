import "server-only";
import { and, eq, asc, sql, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { marketingAgency, marketingInfluencer } from "@/lib/db/schema";
import type { AgencyType } from "@/lib/db/schema";

/* ============================ AGÊNCIAS ============================ */

export async function listAgencies(tenantId: string, opts?: { type?: AgencyType; q?: string }) {
  const conds = [eq(marketingAgency.tenantId, tenantId)];
  if (opts?.type) conds.push(eq(marketingAgency.agencyType, opts.type));
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const m = or(ilike(marketingAgency.name, term), ilike(marketingAgency.contactName, term));
    if (m) conds.push(m);
  }
  // # de ações e verba investida por agência
  const actCount = sql<string>`(
    select count(*) from marketing_action a where a.agency_id = ${marketingAgency.id}
  )`;
  const actSpent = sql<string>`(
    select coalesce(sum(a.spent), 0) from marketing_action a where a.agency_id = ${marketingAgency.id}
  )`;
  return db
    .select({
      id: marketingAgency.id,
      name: marketingAgency.name,
      agencyType: marketingAgency.agencyType,
      contactName: marketingAgency.contactName,
      email: marketingAgency.email,
      phone: marketingAgency.phone,
      notes: marketingAgency.notes,
      actionsCount: actCount,
      invested: actSpent,
    })
    .from(marketingAgency)
    .where(and(...conds))
    .orderBy(asc(marketingAgency.name))
    .limit(300);
}

export type AgencyInput = {
  name: string;
  agencyType: AgencyType;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export async function createAgency(tenantId: string, input: AgencyInput, userId: string) {
  const inserted = await db
    .insert(marketingAgency)
    .values({
      tenantId,
      name: input.name,
      agencyType: input.agencyType,
      contactName: input.contactName,
      email: input.email,
      phone: input.phone,
      notes: input.notes,
      createdBy: userId,
    })
    .returning({ id: marketingAgency.id });
  return { id: inserted[0].id };
}

export async function listAgencyOptions(tenantId: string) {
  return db
    .select({ id: marketingAgency.id, name: marketingAgency.name, agencyType: marketingAgency.agencyType })
    .from(marketingAgency)
    .where(eq(marketingAgency.tenantId, tenantId))
    .orderBy(asc(marketingAgency.name));
}

/* ============================ INFLUENCIADORES ============================ */

export async function listInfluencers(tenantId: string, opts?: { q?: string }) {
  const conds = [eq(marketingInfluencer.tenantId, tenantId)];
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const m = or(
      ilike(marketingInfluencer.name, term),
      ilike(marketingInfluencer.handle, term),
      ilike(marketingInfluencer.segment, term),
    );
    if (m) conds.push(m);
  }
  const actCount = sql<string>`(
    select count(*) from marketing_action a where a.influencer_id = ${marketingInfluencer.id}
  )`;
  const actReach = sql<string>`(
    select coalesce(sum(a.reach_actual), 0) from marketing_action a where a.influencer_id = ${marketingInfluencer.id}
  )`;
  return db
    .select({
      id: marketingInfluencer.id,
      name: marketingInfluencer.name,
      handle: marketingInfluencer.handle,
      platform: marketingInfluencer.platform,
      followers: marketingInfluencer.followers,
      fee: marketingInfluencer.fee,
      segment: marketingInfluencer.segment,
      notes: marketingInfluencer.notes,
      actionsCount: actCount,
      reachDelivered: actReach,
    })
    .from(marketingInfluencer)
    .where(and(...conds))
    .orderBy(asc(marketingInfluencer.name))
    .limit(300);
}

export type InfluencerInput = {
  name: string;
  handle: string | null;
  platform: string | null;
  followers: number | null;
  fee: number | null;
  segment: string | null;
  notes: string | null;
};

export async function createInfluencer(tenantId: string, input: InfluencerInput, userId: string) {
  const inserted = await db
    .insert(marketingInfluencer)
    .values({
      tenantId,
      name: input.name,
      handle: input.handle,
      platform: input.platform,
      followers: input.followers,
      fee: input.fee != null ? input.fee.toFixed(2) : null,
      segment: input.segment,
      notes: input.notes,
      createdBy: userId,
    })
    .returning({ id: marketingInfluencer.id });
  return { id: inserted[0].id };
}

export async function listInfluencerOptions(tenantId: string) {
  return db
    .select({
      id: marketingInfluencer.id,
      name: marketingInfluencer.name,
      handle: marketingInfluencer.handle,
    })
    .from(marketingInfluencer)
    .where(eq(marketingInfluencer.tenantId, tenantId))
    .orderBy(asc(marketingInfluencer.name));
}

/** Contagem simples para KPIs de dashboard. */
export async function registryCounts(tenantId: string) {
  const [ag, inf] = await Promise.all([
    db
      .select({ c: sql<string>`count(*)` })
      .from(marketingAgency)
      .where(eq(marketingAgency.tenantId, tenantId)),
    db
      .select({ c: sql<string>`count(*)` })
      .from(marketingInfluencer)
      .where(eq(marketingInfluencer.tenantId, tenantId)),
  ]);
  return { agencies: Number(ag[0]?.c ?? 0), influencers: Number(inf[0]?.c ?? 0) };
}
