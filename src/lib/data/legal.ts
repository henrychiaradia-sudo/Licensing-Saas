import "server-only";
import { and, eq, desc, asc, sql, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { legalCase, legalCaseEvent, brand, licensee } from "@/lib/db/schema";
import type { LegalCaseStatus, LegalCaseType, LegalCasePriority, LegalEventType } from "@/lib/db/schema";

export async function listLegalCases(
  tenantId: string,
  opts?: { status?: LegalCaseStatus; type?: LegalCaseType; q?: string },
) {
  const conds = [eq(legalCase.tenantId, tenantId)];
  if (opts?.status) conds.push(eq(legalCase.status, opts.status));
  if (opts?.type) conds.push(eq(legalCase.caseType, opts.type));
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const m = or(
      ilike(legalCase.caseNumber, term),
      ilike(legalCase.title, term),
      ilike(legalCase.counterparty, term),
    );
    if (m) conds.push(m);
  }
  return db
    .select({
      id: legalCase.id,
      caseNumber: legalCase.caseNumber,
      title: legalCase.title,
      caseType: legalCase.caseType,
      status: legalCase.status,
      priority: legalCase.priority,
      counterparty: legalCase.counterparty,
      amountAtRisk: legalCase.amountAtRisk,
      responsible: legalCase.responsible,
      dueDate: legalCase.dueDate,
      brandName: brand.name,
    })
    .from(legalCase)
    .leftJoin(brand, eq(brand.id, legalCase.brandId))
    .where(and(...conds))
    .orderBy(desc(legalCase.createdAt))
    .limit(300);
}

export async function legalSummary(tenantId: string) {
  const year = new Date().toISOString().slice(0, 4);
  const r = await db
    .select({
      open: sql<string>`count(*) filter (where ${legalCase.status} in ('aberto','em_andamento'))`,
      critical: sql<string>`count(*) filter (where ${legalCase.priority} = 'critica' and ${legalCase.status} in ('aberto','em_andamento'))`,
      atRisk: sql<string>`coalesce(sum(${legalCase.amountAtRisk}) filter (where ${legalCase.status} in ('aberto','em_andamento')), 0)`,
      closedYear: sql<string>`count(*) filter (where ${legalCase.status} in ('encerrado','arquivado') and to_char(${legalCase.closedAt}, 'YYYY') = ${year})`,
      total: sql<string>`count(*)`,
    })
    .from(legalCase)
    .where(eq(legalCase.tenantId, tenantId));
  return {
    open: Number(r[0]?.open ?? 0),
    critical: Number(r[0]?.critical ?? 0),
    atRisk: r[0]?.atRisk ?? "0",
    closedYear: Number(r[0]?.closedYear ?? 0),
    total: Number(r[0]?.total ?? 0),
  };
}

export async function getLegalCaseDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: legalCase.id,
      caseNumber: legalCase.caseNumber,
      title: legalCase.title,
      caseType: legalCase.caseType,
      status: legalCase.status,
      priority: legalCase.priority,
      counterparty: legalCase.counterparty,
      amountAtRisk: legalCase.amountAtRisk,
      responsible: legalCase.responsible,
      forum: legalCase.forum,
      openedAt: legalCase.openedAt,
      dueDate: legalCase.dueDate,
      closedAt: legalCase.closedAt,
      description: legalCase.description,
      notes: legalCase.notes,
      brandName: brand.name,
      licenseeName: licensee.legalName,
    })
    .from(legalCase)
    .leftJoin(brand, eq(brand.id, legalCase.brandId))
    .leftJoin(licensee, eq(licensee.id, legalCase.licenseeId))
    .where(and(eq(legalCase.id, id), eq(legalCase.tenantId, tenantId)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;
  const events = await db
    .select()
    .from(legalCaseEvent)
    .where(eq(legalCaseEvent.caseId, id))
    .orderBy(desc(legalCaseEvent.occurredAt), desc(legalCaseEvent.createdAt));
  return { legalCase: head, events };
}

export type LegalCaseInput = {
  title: string;
  caseType: LegalCaseType;
  status: LegalCaseStatus;
  priority: LegalCasePriority;
  counterparty: string | null;
  licenseeId: string | null;
  brandId: string | null;
  amountAtRisk: number;
  responsible: string | null;
  forum: string | null;
  openedAt: string | null;
  dueDate: string | null;
  description: string | null;
  notes: string | null;
};

export async function createLegalCase(
  tenantId: string,
  input: LegalCaseInput,
  userId: string,
): Promise<{ id: string }> {
  const cnt = await db
    .select({ c: sql<string>`count(*)` })
    .from(legalCase)
    .where(eq(legalCase.tenantId, tenantId));
  const year = new Date().toISOString().slice(0, 4);
  const caseNumber = `JUR-${year}-${String(Number(cnt[0]?.c ?? 0) + 1).padStart(4, "0")}`;
  const inserted = await db
    .insert(legalCase)
    .values({
      tenantId,
      caseNumber,
      title: input.title,
      caseType: input.caseType,
      status: input.status,
      priority: input.priority,
      counterparty: input.counterparty,
      licenseeId: input.licenseeId,
      brandId: input.brandId,
      amountAtRisk: input.amountAtRisk.toFixed(2),
      responsible: input.responsible,
      forum: input.forum,
      openedAt: input.openedAt,
      dueDate: input.dueDate,
      description: input.description,
      notes: input.notes,
      createdBy: userId,
    })
    .returning({ id: legalCase.id });
  return { id: inserted[0].id };
}

const LEGAL_STATUS_VALUES = ["aberto", "em_andamento", "suspenso", "encerrado", "arquivado"] as const;

export async function setLegalCaseStatus(
  tenantId: string,
  id: string,
  status: LegalCaseStatus,
): Promise<void> {
  if (!(LEGAL_STATUS_VALUES as readonly string[]).includes(status)) return;
  const closes = status === "encerrado" || status === "arquivado";
  await db
    .update(legalCase)
    .set({
      status,
      closedAt: closes ? new Date().toISOString().slice(0, 10) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(legalCase.id, id), eq(legalCase.tenantId, tenantId)));
}

export type LegalEventInput = {
  eventType: LegalEventType;
  description: string;
  occurredAt: string | null;
};

export async function addLegalEvent(
  tenantId: string,
  caseId: string,
  input: LegalEventInput,
  userId: string,
): Promise<void> {
  const c = await db
    .select({ id: legalCase.id })
    .from(legalCase)
    .where(and(eq(legalCase.id, caseId), eq(legalCase.tenantId, tenantId)))
    .limit(1);
  if (!c[0]) throw new Error("Caso não encontrado.");
  await db.insert(legalCaseEvent).values({
    tenantId,
    caseId,
    eventType: input.eventType,
    description: input.description,
    occurredAt: input.occurredAt,
    createdBy: userId,
  });
}
