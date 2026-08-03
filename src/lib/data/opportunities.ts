import "server-only";
import { and, eq, desc, asc, sql, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  licensingOpportunity,
  opportunityActivity,
  opportunityContact,
  task,
  brand,
  segment,
  appUser,
  licensee,
} from "@/lib/db/schema";
import type { OpportunityStage } from "@/lib/db/schema";

/** Data (YYYY-MM-DD) somando `days` a partir de hoje. */
function addDaysIso(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

export const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
  prospeccao: 20,
  qualificacao: 40,
  proposta: 60,
  negociacao: 80,
  ganho: 100,
  perdido: 0,
};

const OPEN_STAGES: OpportunityStage[] = ["prospeccao", "qualificacao", "proposta", "negociacao"];

export async function listOpportunities(
  tenantId: string,
  opts?: { stage?: OpportunityStage; q?: string },
) {
  const conds = [eq(licensingOpportunity.tenantId, tenantId)];
  if (opts?.stage) conds.push(eq(licensingOpportunity.stage, opts.stage));
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const m = or(
      ilike(licensingOpportunity.opportunityNumber, term),
      ilike(licensingOpportunity.name, term),
      ilike(licensingOpportunity.companyName, term),
    );
    if (m) conds.push(m);
  }
  return db
    .select({
      id: licensingOpportunity.id,
      opportunityNumber: licensingOpportunity.opportunityNumber,
      name: licensingOpportunity.name,
      companyName: licensingOpportunity.companyName,
      stage: licensingOpportunity.stage,
      estimatedValue: licensingOpportunity.estimatedValue,
      probability: licensingOpportunity.probability,
      expectedCloseDate: licensingOpportunity.expectedCloseDate,
      brandName: brand.name,
      ownerName: appUser.name,
    })
    .from(licensingOpportunity)
    .leftJoin(brand, eq(brand.id, licensingOpportunity.brandId))
    .leftJoin(appUser, eq(appUser.id, licensingOpportunity.ownerUserId))
    .where(and(...conds))
    .orderBy(desc(licensingOpportunity.estimatedValue))
    .limit(300);
}

export async function pipelineSummary(tenantId: string) {
  const r = await db
    .select({
      openValue: sql<string>`coalesce(sum(${licensingOpportunity.estimatedValue}) filter (where ${licensingOpportunity.stage} in ('prospeccao','qualificacao','proposta','negociacao')), 0)`,
      weighted: sql<string>`coalesce(sum(${licensingOpportunity.estimatedValue} * ${licensingOpportunity.probability} / 100.0) filter (where ${licensingOpportunity.stage} in ('prospeccao','qualificacao','proposta','negociacao')), 0)`,
      openCount: sql<string>`count(*) filter (where ${licensingOpportunity.stage} in ('prospeccao','qualificacao','proposta','negociacao'))`,
      won: sql<string>`count(*) filter (where ${licensingOpportunity.stage} = 'ganho')`,
      lost: sql<string>`count(*) filter (where ${licensingOpportunity.stage} = 'perdido')`,
      wonValue: sql<string>`coalesce(sum(${licensingOpportunity.estimatedValue}) filter (where ${licensingOpportunity.stage} = 'ganho'), 0)`,
    })
    .from(licensingOpportunity)
    .where(eq(licensingOpportunity.tenantId, tenantId));
  const won = Number(r[0]?.won ?? 0);
  const lost = Number(r[0]?.lost ?? 0);
  const decided = won + lost;
  return {
    openValue: r[0]?.openValue ?? "0",
    weighted: r[0]?.weighted ?? "0",
    openCount: Number(r[0]?.openCount ?? 0),
    won,
    lost,
    wonValue: r[0]?.wonValue ?? "0",
    winRate: decided > 0 ? Math.round((won / decided) * 100) : null,
  };
}

export async function getOpportunityDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: licensingOpportunity.id,
      opportunityNumber: licensingOpportunity.opportunityNumber,
      name: licensingOpportunity.name,
      companyName: licensingOpportunity.companyName,
      contactName: licensingOpportunity.contactName,
      contactEmail: licensingOpportunity.contactEmail,
      contactPhone: licensingOpportunity.contactPhone,
      stage: licensingOpportunity.stage,
      estimatedValue: licensingOpportunity.estimatedValue,
      probability: licensingOpportunity.probability,
      source: licensingOpportunity.source,
      firstContactDate: licensingOpportunity.firstContactDate,
      firstContactChannel: licensingOpportunity.firstContactChannel,
      expectedCloseDate: licensingOpportunity.expectedCloseDate,
      notes: licensingOpportunity.notes,
      lostReason: licensingOpportunity.lostReason,
      licenseeId: licensingOpportunity.licenseeId,
      brandId: licensingOpportunity.brandId,
      brandName: brand.name,
      segmentName: segment.name,
      ownerName: appUser.name,
    })
    .from(licensingOpportunity)
    .leftJoin(brand, eq(brand.id, licensingOpportunity.brandId))
    .leftJoin(segment, eq(segment.id, licensingOpportunity.segmentId))
    .leftJoin(appUser, eq(appUser.id, licensingOpportunity.ownerUserId))
    .where(and(eq(licensingOpportunity.id, id), eq(licensingOpportunity.tenantId, tenantId)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;

  const activities = await db
    .select()
    .from(opportunityActivity)
    .where(eq(opportunityActivity.opportunityId, id))
    .orderBy(desc(opportunityActivity.occurredAt));

  const contacts = await listOpportunityContacts(tenantId, id);

  let licenseeName: string | null = null;
  if (head.licenseeId) {
    const l = await db
      .select({ legalName: licensee.legalName })
      .from(licensee)
      .where(eq(licensee.id, head.licenseeId))
      .limit(1);
    licenseeName = l[0]?.legalName ?? null;
  }
  return { opportunity: head, activities, contacts, licenseeName };
}

export async function listOpportunityContacts(tenantId: string, opportunityId: string) {
  return db
    .select({
      id: opportunityContact.id,
      name: opportunityContact.name,
      role: opportunityContact.role,
      email: opportunityContact.email,
      phone: opportunityContact.phone,
      isPrimary: opportunityContact.isPrimary,
    })
    .from(opportunityContact)
    .where(
      and(
        eq(opportunityContact.tenantId, tenantId),
        eq(opportunityContact.opportunityId, opportunityId),
      ),
    )
    .orderBy(desc(opportunityContact.isPrimary), asc(opportunityContact.name));
}

export async function addOpportunityContact(
  tenantId: string,
  opportunityId: string,
  input: { name: string; role: string | null; email: string | null; phone: string | null; isPrimary: boolean },
  userId: string,
): Promise<void> {
  const exists = await db
    .select({ id: licensingOpportunity.id })
    .from(licensingOpportunity)
    .where(and(eq(licensingOpportunity.id, opportunityId), eq(licensingOpportunity.tenantId, tenantId)))
    .limit(1);
  if (!exists[0]) throw new Error("Oportunidade não encontrada.");
  await db.insert(opportunityContact).values({
    tenantId,
    opportunityId,
    name: input.name,
    role: input.role,
    email: input.email,
    phone: input.phone,
    isPrimary: input.isPrimary,
    createdBy: userId,
  });
}

export async function deleteOpportunityContact(
  tenantId: string,
  contactId: string,
): Promise<void> {
  await db
    .delete(opportunityContact)
    .where(and(eq(opportunityContact.id, contactId), eq(opportunityContact.tenantId, tenantId)));
}

export type OpportunityInput = {
  name: string;
  companyName: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  brandId: string | null;
  segmentId: string | null;
  stage: OpportunityStage;
  estimatedValue: number;
  source: string | null;
  firstContactDate: string | null;
  firstContactChannel: string | null;
  expectedCloseDate: string | null;
  ownerUserId: string | null;
  notes: string | null;
};

export async function createOpportunity(
  tenantId: string,
  input: OpportunityInput,
  userId: string,
): Promise<{ id: string }> {
  const cnt = await db
    .select({ c: sql<string>`count(*)` })
    .from(licensingOpportunity)
    .where(eq(licensingOpportunity.tenantId, tenantId));
  const year = new Date().toISOString().slice(0, 4);
  const opportunityNumber = `OPP-${year}-${String(Number(cnt[0]?.c ?? 0) + 1).padStart(4, "0")}`;

  const inserted = await db
    .insert(licensingOpportunity)
    .values({
      tenantId,
      opportunityNumber,
      name: input.name,
      companyName: input.companyName,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      brandId: input.brandId,
      segmentId: input.segmentId,
      stage: input.stage,
      estimatedValue: input.estimatedValue.toFixed(2),
      probability: STAGE_PROBABILITY[input.stage],
      source: input.source,
      firstContactDate: input.firstContactDate,
      firstContactChannel: input.firstContactChannel,
      expectedCloseDate: input.expectedCloseDate,
      ownerUserId: input.ownerUserId ?? userId,
      notes: input.notes,
      createdBy: userId,
    })
    .returning({ id: licensingOpportunity.id });
  const opportunityId = inserted[0].id;

  // Contato inicial vira o 1º responsável (primário) do prospect.
  if (input.contactName) {
    await db.insert(opportunityContact).values({
      tenantId,
      opportunityId,
      name: input.contactName,
      role: "Contato principal",
      email: input.contactEmail,
      phone: input.contactPhone,
      isPrimary: true,
      createdBy: userId,
    });
  }

  // Régua automática de follow-up: FU1 em 8 dias, FU2 em 30 dias.
  const label = `Oportunidade · ${input.name}`;
  await db.insert(task).values([
    {
      tenantId,
      title: `Follow-up 1 — ${input.name}`,
      description: "Primeiro follow-up automático (7–10 dias) do primeiro contato.",
      status: "a_fazer" as const,
      priority: "media" as const,
      assignee: null,
      dueDate: addDaysIso(8),
      entityType: "opportunity",
      entityId: opportunityId,
      entityLabel: label,
      createdBy: userId,
    },
    {
      tenantId,
      title: `Follow-up 2 — ${input.name}`,
      description: "Segundo follow-up automático (30 dias) para reengajar o prospect.",
      status: "a_fazer" as const,
      priority: "media" as const,
      assignee: null,
      dueDate: addDaysIso(30),
      entityType: "opportunity",
      entityId: opportunityId,
      entityLabel: label,
      createdBy: userId,
    },
  ]);

  return { id: opportunityId };
}

export async function setOpportunityStage(
  tenantId: string,
  id: string,
  stage: OpportunityStage,
  lostReason?: string | null,
): Promise<void> {
  const exists = await db
    .select({ id: licensingOpportunity.id })
    .from(licensingOpportunity)
    .where(and(eq(licensingOpportunity.id, id), eq(licensingOpportunity.tenantId, tenantId)))
    .limit(1);
  if (!exists[0]) throw new Error("Oportunidade não encontrada.");
  await db
    .update(licensingOpportunity)
    .set({
      stage,
      probability: STAGE_PROBABILITY[stage],
      lostReason: stage === "perdido" ? (lostReason ?? null) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(licensingOpportunity.id, id), eq(licensingOpportunity.tenantId, tenantId)));
}

export async function addOpportunityActivity(
  tenantId: string,
  opportunityId: string,
  activityType: string,
  description: string,
  userId: string,
): Promise<void> {
  const exists = await db
    .select({ id: licensingOpportunity.id })
    .from(licensingOpportunity)
    .where(and(eq(licensingOpportunity.id, opportunityId), eq(licensingOpportunity.tenantId, tenantId)))
    .limit(1);
  if (!exists[0]) throw new Error("Oportunidade não encontrada.");
  await db.insert(opportunityActivity).values({
    tenantId,
    opportunityId,
    activityType,
    description,
    createdBy: userId,
  });
}

/**
 * Converte uma oportunidade ganha em licenciado: cria o cadastro de licenciado a
 * partir dos dados do prospect, vincula à oportunidade e marca o estágio como ganho.
 */
export async function convertOpportunity(
  tenantId: string,
  id: string,
  userId: string,
): Promise<{ licenseeId: string }> {
  const rows = await db
    .select({
      id: licensingOpportunity.id,
      companyName: licensingOpportunity.companyName,
      name: licensingOpportunity.name,
      segmentId: licensingOpportunity.segmentId,
      licenseeId: licensingOpportunity.licenseeId,
    })
    .from(licensingOpportunity)
    .where(and(eq(licensingOpportunity.id, id), eq(licensingOpportunity.tenantId, tenantId)))
    .limit(1);
  const opp = rows[0];
  if (!opp) throw new Error("Oportunidade não encontrada.");
  if (opp.licenseeId) return { licenseeId: opp.licenseeId };

  const legalName = opp.companyName?.trim() || opp.name;
  const inserted = await db
    .insert(licensee)
    .values({
      tenantId,
      legalName,
      segmentId: opp.segmentId,
      status: "em_negociacao",
    })
    .returning({ id: licensee.id });
  const licenseeId = inserted[0].id;

  await db
    .update(licensingOpportunity)
    .set({
      stage: "ganho",
      probability: 100,
      licenseeId,
      updatedAt: new Date(),
    })
    .where(and(eq(licensingOpportunity.id, id), eq(licensingOpportunity.tenantId, tenantId)));

  await db.insert(opportunityActivity).values({
    tenantId,
    opportunityId: id,
    activityType: "conversao",
    description: `Oportunidade convertida no licenciado "${legalName}".`,
    createdBy: userId,
  });

  return { licenseeId };
}

export async function listOwnerOptions(tenantId: string) {
  return db
    .select({ id: appUser.id, name: appUser.name })
    .from(appUser)
    .where(eq(appUser.tenantId, tenantId))
    .orderBy(asc(appUser.name))
    .limit(100);
}
