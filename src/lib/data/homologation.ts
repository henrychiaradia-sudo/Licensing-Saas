import "server-only";
import { and, eq, asc, desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  supplier,
  homologationChecklist,
  homologationChecklistItem,
  supplierHomologation,
  homologationAnswer,
} from "@/lib/db/schema";
import type {
  SupplierType,
  HomologationStatus,
  HomologationItemResult,
} from "@/lib/db/schema";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ *
 * Checklists configuráveis (templates)
 * ------------------------------------------------------------------ */

export async function listChecklists(tenantId: string) {
  const lists = await db
    .select()
    .from(homologationChecklist)
    .where(eq(homologationChecklist.tenantId, tenantId))
    .orderBy(asc(homologationChecklist.name));

  const counts = await db
    .select({ checklistId: homologationChecklistItem.checklistId, c: count() })
    .from(homologationChecklistItem)
    .where(eq(homologationChecklistItem.tenantId, tenantId))
    .groupBy(homologationChecklistItem.checklistId);
  const map = new Map(counts.map((r) => [r.checklistId, Number(r.c)]));

  return lists.map((l) => ({ ...l, itemCount: map.get(l.id) ?? 0 }));
}

export async function listActiveChecklists(tenantId: string) {
  return db
    .select({
      id: homologationChecklist.id,
      name: homologationChecklist.name,
      supplierType: homologationChecklist.supplierType,
    })
    .from(homologationChecklist)
    .where(and(eq(homologationChecklist.tenantId, tenantId), eq(homologationChecklist.isActive, true)))
    .orderBy(asc(homologationChecklist.name));
}

export async function getChecklist(tenantId: string, id: string) {
  const rows = await db
    .select()
    .from(homologationChecklist)
    .where(and(eq(homologationChecklist.id, id), eq(homologationChecklist.tenantId, tenantId)))
    .limit(1);
  const checklist = rows[0];
  if (!checklist) return null;

  const items = await db
    .select()
    .from(homologationChecklistItem)
    .where(eq(homologationChecklistItem.checklistId, id))
    .orderBy(asc(homologationChecklistItem.orderIndex), asc(homologationChecklistItem.createdAt));

  return { checklist, items };
}

export type ChecklistInput = {
  name: string;
  description: string | null;
  supplierType: SupplierType | null;
};

export async function createChecklist(tenantId: string, input: ChecklistInput): Promise<{ id: string }> {
  const inserted = await db
    .insert(homologationChecklist)
    .values({
      tenantId,
      name: input.name,
      description: input.description,
      supplierType: input.supplierType,
    })
    .returning({ id: homologationChecklist.id });
  return { id: inserted[0].id };
}

export async function setChecklistActive(tenantId: string, id: string, isActive: boolean): Promise<void> {
  await db
    .update(homologationChecklist)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(homologationChecklist.id, id), eq(homologationChecklist.tenantId, tenantId)));
}

export async function deleteChecklist(tenantId: string, id: string): Promise<void> {
  await db
    .delete(homologationChecklistItem)
    .where(and(eq(homologationChecklistItem.tenantId, tenantId), eq(homologationChecklistItem.checklistId, id)));
  await db
    .delete(homologationChecklist)
    .where(and(eq(homologationChecklist.id, id), eq(homologationChecklist.tenantId, tenantId)));
}

export type ChecklistItemInput = {
  label: string;
  category: string | null;
  weight: number;
  required: boolean;
};

export async function addChecklistItem(
  tenantId: string,
  checklistId: string,
  input: ChecklistItemInput,
): Promise<void> {
  const cl = await db
    .select({ id: homologationChecklist.id })
    .from(homologationChecklist)
    .where(and(eq(homologationChecklist.id, checklistId), eq(homologationChecklist.tenantId, tenantId)))
    .limit(1);
  if (!cl[0]) throw new Error("Checklist não encontrado.");

  const maxRows = await db
    .select({ m: count() })
    .from(homologationChecklistItem)
    .where(eq(homologationChecklistItem.checklistId, checklistId));
  const orderIndex = Number(maxRows[0]?.m ?? 0);

  await db.insert(homologationChecklistItem).values({
    tenantId,
    checklistId,
    label: input.label,
    category: input.category,
    weight: input.weight,
    required: input.required,
    orderIndex,
  });
}

export async function deleteChecklistItem(tenantId: string, id: string): Promise<void> {
  await db
    .delete(homologationChecklistItem)
    .where(and(eq(homologationChecklistItem.id, id), eq(homologationChecklistItem.tenantId, tenantId)));
}

/* ------------------------------------------------------------------ *
 * Processo de homologação por fornecedor
 * ------------------------------------------------------------------ */

/** Recalcula o score de conformidade (0–100) ponderado por peso dos itens. */
async function recomputeScore(homologationId: string): Promise<number> {
  const rows = await db
    .select({
      result: homologationAnswer.result,
      weight: homologationChecklistItem.weight,
    })
    .from(homologationAnswer)
    .leftJoin(homologationChecklistItem, eq(homologationChecklistItem.id, homologationAnswer.itemId))
    .where(eq(homologationAnswer.homologationId, homologationId));

  let conforme = 0;
  let denom = 0;
  for (const r of rows) {
    const w = r.weight ?? 1;
    if (r.result === "conforme") {
      conforme += w;
      denom += w;
    } else if (r.result === "nao_conforme") {
      denom += w;
    }
  }
  const score = denom > 0 ? Math.round((conforme / denom) * 100) : 0;
  await db
    .update(supplierHomologation)
    .set({ score, updatedAt: new Date() })
    .where(eq(supplierHomologation.id, homologationId));
  return score;
}

export async function getSupplierHomologation(tenantId: string, supplierId: string) {
  const rows = await db
    .select()
    .from(supplierHomologation)
    .where(and(eq(supplierHomologation.tenantId, tenantId), eq(supplierHomologation.supplierId, supplierId)))
    .orderBy(desc(supplierHomologation.createdAt))
    .limit(1);
  const homologation = rows[0];
  if (!homologation) return null;

  const clRows = await db
    .select()
    .from(homologationChecklist)
    .where(eq(homologationChecklist.id, homologation.checklistId))
    .limit(1);
  const checklist = clRows[0] ?? null;

  const items = await db
    .select()
    .from(homologationChecklistItem)
    .where(eq(homologationChecklistItem.checklistId, homologation.checklistId))
    .orderBy(asc(homologationChecklistItem.orderIndex), asc(homologationChecklistItem.createdAt));

  const answers = await db
    .select()
    .from(homologationAnswer)
    .where(eq(homologationAnswer.homologationId, homologation.id));
  const answerMap = new Map(answers.map((a) => [a.itemId, a]));

  const merged = items.map((item) => ({ item, answer: answerMap.get(item.id) ?? null }));
  return { homologation, checklist, items: merged };
}

export async function startHomologation(
  tenantId: string,
  supplierId: string,
  checklistId: string,
): Promise<{ id: string }> {
  const s = await db
    .select({ id: supplier.id })
    .from(supplier)
    .where(and(eq(supplier.id, supplierId), eq(supplier.tenantId, tenantId)))
    .limit(1);
  if (!s[0]) throw new Error("Fornecedor não encontrado.");

  const cl = await db
    .select({ id: homologationChecklist.id })
    .from(homologationChecklist)
    .where(and(eq(homologationChecklist.id, checklistId), eq(homologationChecklist.tenantId, tenantId)))
    .limit(1);
  if (!cl[0]) throw new Error("Checklist inválido.");

  const inserted = await db
    .insert(supplierHomologation)
    .values({
      tenantId,
      supplierId,
      checklistId,
      status: "em_andamento",
      score: 0,
      startedAt: today(),
    })
    .returning({ id: supplierHomologation.id });
  const homologationId = inserted[0].id;

  const items = await db
    .select({ id: homologationChecklistItem.id })
    .from(homologationChecklistItem)
    .where(eq(homologationChecklistItem.checklistId, checklistId));
  if (items.length) {
    await db.insert(homologationAnswer).values(
      items.map((it) => ({
        tenantId,
        homologationId,
        itemId: it.id,
        result: "pendente" as HomologationItemResult,
      })),
    );
  }

  await db
    .update(supplier)
    .set({ status: "em_homologacao", updatedAt: new Date() })
    .where(and(eq(supplier.id, supplierId), eq(supplier.tenantId, tenantId)));

  return { id: homologationId };
}

export async function saveAnswer(
  tenantId: string,
  homologationId: string,
  itemId: string,
  result: HomologationItemResult,
  notes: string | null,
): Promise<number> {
  const h = await db
    .select({ id: supplierHomologation.id })
    .from(supplierHomologation)
    .where(and(eq(supplierHomologation.id, homologationId), eq(supplierHomologation.tenantId, tenantId)))
    .limit(1);
  if (!h[0]) throw new Error("Homologação não encontrada.");

  await db
    .insert(homologationAnswer)
    .values({ tenantId, homologationId, itemId, result, notes })
    .onConflictDoUpdate({
      target: [homologationAnswer.homologationId, homologationAnswer.itemId],
      set: { result, notes, updatedAt: new Date() },
    });

  return recomputeScore(homologationId);
}

const DECISION_TO_SUPPLIER: Record<string, string> = {
  aprovada: "homologado",
  condicional: "condicional",
  reprovada: "em_avaliacao",
};

export async function decideHomologation(
  tenantId: string,
  homologationId: string,
  decision: Extract<HomologationStatus, "aprovada" | "condicional" | "reprovada">,
  decidedBy: string | null,
): Promise<void> {
  const rows = await db
    .select({ id: supplierHomologation.id, supplierId: supplierHomologation.supplierId })
    .from(supplierHomologation)
    .where(and(eq(supplierHomologation.id, homologationId), eq(supplierHomologation.tenantId, tenantId)))
    .limit(1);
  const h = rows[0];
  if (!h) throw new Error("Homologação não encontrada.");

  await db
    .update(supplierHomologation)
    .set({ status: decision, decidedAt: today(), decidedBy, updatedAt: new Date() })
    .where(eq(supplierHomologation.id, homologationId));

  const supStatus = DECISION_TO_SUPPLIER[decision];
  if (supStatus) {
    await db
      .update(supplier)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set({ status: supStatus as any, updatedAt: new Date() })
      .where(and(eq(supplier.id, h.supplierId), eq(supplier.tenantId, tenantId)));
  }
}
