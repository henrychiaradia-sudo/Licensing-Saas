import "server-only";
import { and, eq, desc, asc, sql, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { qualityInspection, nonConformity, supplier } from "@/lib/db/schema";
import type {
  QualityInspectionType,
  QualityResult,
  NcSeverity,
  NcStatus,
} from "@/lib/db/schema";

export async function listInspections(
  tenantId: string,
  opts?: { result?: QualityResult; type?: QualityInspectionType; q?: string; supplierId?: string },
) {
  const conds = [eq(qualityInspection.tenantId, tenantId)];
  if (opts?.result) conds.push(eq(qualityInspection.result, opts.result));
  if (opts?.type) conds.push(eq(qualityInspection.inspectionType, opts.type));
  if (opts?.supplierId) conds.push(eq(qualityInspection.supplierId, opts.supplierId));
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const m = or(ilike(qualityInspection.inspectionNumber, term), ilike(qualityInspection.title, term));
    if (m) conds.push(m);
  }
  return db
    .select({
      id: qualityInspection.id,
      inspectionNumber: qualityInspection.inspectionNumber,
      inspectionType: qualityInspection.inspectionType,
      title: qualityInspection.title,
      result: qualityInspection.result,
      sampleSize: qualityInspection.sampleSize,
      defectsFound: qualityInspection.defectsFound,
      inspectedAt: qualityInspection.inspectedAt,
      supplierName: supplier.legalName,
    })
    .from(qualityInspection)
    .leftJoin(supplier, eq(supplier.id, qualityInspection.supplierId))
    .where(and(...conds))
    .orderBy(desc(qualityInspection.createdAt))
    .limit(200);
}

export async function qualitySummary(tenantId: string) {
  const insp = await db
    .select({
      total: sql<string>`count(*)`,
      approved: sql<string>`count(*) filter (where ${qualityInspection.result} in ('aprovado','aprovado_condicional'))`,
      reproved: sql<string>`count(*) filter (where ${qualityInspection.result} = 'reprovado')`,
    })
    .from(qualityInspection)
    .where(eq(qualityInspection.tenantId, tenantId));
  const nc = await db
    .select({
      open: sql<string>`count(*) filter (where ${nonConformity.status} in ('aberta','em_tratamento'))`,
      critical: sql<string>`count(*) filter (where ${nonConformity.severity} in ('alta','critica') and ${nonConformity.status} in ('aberta','em_tratamento'))`,
    })
    .from(nonConformity)
    .where(eq(nonConformity.tenantId, tenantId));
  const total = Number(insp[0]?.total ?? 0);
  const approved = Number(insp[0]?.approved ?? 0);
  const reproved = Number(insp[0]?.reproved ?? 0);
  const decided = approved + reproved;
  return {
    total,
    approved,
    reproved,
    approvalRate: decided > 0 ? Math.round((approved / decided) * 100) : 0,
    openNc: Number(nc[0]?.open ?? 0),
    criticalNc: Number(nc[0]?.critical ?? 0),
  };
}

/** IDs das inspeções que possuem não-conformidades em aberto (para o highlight vindo do dashboard). */
export async function listOpenNcInspectionIds(tenantId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ id: nonConformity.qualityInspectionId })
    .from(nonConformity)
    .where(
      and(
        eq(nonConformity.tenantId, tenantId),
        sql`${nonConformity.status} in ('aberta','em_tratamento')`,
        sql`${nonConformity.qualityInspectionId} is not null`,
      ),
    );
  return rows.map((r) => r.id).filter((x): x is string => !!x);
}

export async function getInspectionDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: qualityInspection.id,
      inspectionNumber: qualityInspection.inspectionNumber,
      inspectionType: qualityInspection.inspectionType,
      title: qualityInspection.title,
      result: qualityInspection.result,
      sampleSize: qualityInspection.sampleSize,
      defectsFound: qualityInspection.defectsFound,
      inspectedAt: qualityInspection.inspectedAt,
      notes: qualityInspection.notes,
      supplierId: qualityInspection.supplierId,
      supplierName: supplier.legalName,
    })
    .from(qualityInspection)
    .leftJoin(supplier, eq(supplier.id, qualityInspection.supplierId))
    .where(and(eq(qualityInspection.id, id), eq(qualityInspection.tenantId, tenantId)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;
  const ncs = await db
    .select()
    .from(nonConformity)
    .where(eq(nonConformity.qualityInspectionId, id))
    .orderBy(asc(nonConformity.createdAt));
  return { inspection: head, ncs };
}

export type InspectionInput = {
  inspectionType: QualityInspectionType;
  title: string;
  supplierId: string | null;
  sampleSize: number;
  defectsFound: number;
  result: QualityResult;
  inspectedAt: string | null;
  notes: string | null;
};

export async function createInspection(
  tenantId: string,
  input: InspectionInput,
  userId: string,
): Promise<{ id: string }> {
  if (input.supplierId) {
    const s = await db
      .select({ id: supplier.id })
      .from(supplier)
      .where(and(eq(supplier.id, input.supplierId), eq(supplier.tenantId, tenantId)))
      .limit(1);
    if (!s[0]) throw new Error("Fornecedor inválido.");
  }
  const cnt = await db
    .select({ c: sql<string>`count(*)` })
    .from(qualityInspection)
    .where(eq(qualityInspection.tenantId, tenantId));
  const year = new Date().toISOString().slice(0, 4);
  const inspectionNumber = `INS-${year}-${String(Number(cnt[0]?.c ?? 0) + 1).padStart(4, "0")}`;

  const inserted = await db
    .insert(qualityInspection)
    .values({
      tenantId,
      inspectionNumber,
      inspectionType: input.inspectionType,
      title: input.title,
      supplierId: input.supplierId,
      sampleSize: input.sampleSize,
      defectsFound: input.defectsFound,
      result: input.result,
      inspectedAt: input.inspectedAt,
      notes: input.notes,
      createdBy: userId,
    })
    .returning({ id: qualityInspection.id });
  return { id: inserted[0].id };
}

export async function setInspectionResult(
  tenantId: string,
  id: string,
  result: QualityResult,
): Promise<void> {
  const exists = await db
    .select({ id: qualityInspection.id })
    .from(qualityInspection)
    .where(and(eq(qualityInspection.id, id), eq(qualityInspection.tenantId, tenantId)))
    .limit(1);
  if (!exists[0]) throw new Error("Inspeção não encontrada.");
  await db
    .update(qualityInspection)
    .set({ result, updatedAt: new Date() })
    .where(and(eq(qualityInspection.id, id), eq(qualityInspection.tenantId, tenantId)));
}

export type NonConformityInput = {
  inspectionId: string;
  severity: NcSeverity;
  description: string;
  disposition: string | null;
  correctiveAction: string | null;
};

export async function addNonConformity(
  tenantId: string,
  input: NonConformityInput,
  userId: string,
): Promise<{ id: string }> {
  const insp = await db
    .select({ id: qualityInspection.id, supplierId: qualityInspection.supplierId })
    .from(qualityInspection)
    .where(and(eq(qualityInspection.id, input.inspectionId), eq(qualityInspection.tenantId, tenantId)))
    .limit(1);
  if (!insp[0]) throw new Error("Inspeção inválida.");

  const cnt = await db
    .select({ c: sql<string>`count(*)` })
    .from(nonConformity)
    .where(eq(nonConformity.tenantId, tenantId));
  const year = new Date().toISOString().slice(0, 4);
  const ncNumber = `NC-${year}-${String(Number(cnt[0]?.c ?? 0) + 1).padStart(4, "0")}`;

  const inserted = await db
    .insert(nonConformity)
    .values({
      tenantId,
      ncNumber,
      qualityInspectionId: input.inspectionId,
      supplierId: insp[0].supplierId,
      severity: input.severity,
      status: "aberta",
      description: input.description,
      disposition: input.disposition,
      correctiveAction: input.correctiveAction,
      openedAt: new Date().toISOString().slice(0, 10),
      createdBy: userId,
    })
    .returning({ id: nonConformity.id });
  return { id: inserted[0].id };
}

export async function setNcStatus(
  tenantId: string,
  id: string,
  status: NcStatus,
): Promise<void> {
  const exists = await db
    .select({ id: nonConformity.id })
    .from(nonConformity)
    .where(and(eq(nonConformity.id, id), eq(nonConformity.tenantId, tenantId)))
    .limit(1);
  if (!exists[0]) throw new Error("Não-conformidade não encontrada.");
  const patch: { status: NcStatus; updatedAt: Date; resolvedAt?: string } = {
    status,
    updatedAt: new Date(),
  };
  if (status === "resolvida") patch.resolvedAt = new Date().toISOString().slice(0, 10);
  await db
    .update(nonConformity)
    .set(patch)
    .where(and(eq(nonConformity.id, id), eq(nonConformity.tenantId, tenantId)));
}
