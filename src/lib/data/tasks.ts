import "server-only";
import { and, eq, desc, asc, sql, or, ilike, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { task, brand, licensee } from "@/lib/db/schema";
import type { TaskStatus, TaskPriority } from "@/lib/db/schema";

export type TaskEntityType = "marca" | "licenciado";

const OPEN_STATUSES = ["a_fazer", "em_andamento"] as const;

export async function listTasks(
  tenantId: string,
  opts?: { status?: TaskStatus; priority?: TaskPriority; q?: string },
) {
  const conds = [eq(task.tenantId, tenantId)];
  if (opts?.status) conds.push(eq(task.status, opts.status));
  if (opts?.priority) conds.push(eq(task.priority, opts.priority));
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const m = or(ilike(task.title, term), ilike(task.assignee, term), ilike(task.entityLabel, term));
    if (m) conds.push(m);
  }
  return db
    .select()
    .from(task)
    .where(and(...conds))
    .orderBy(asc(task.dueDate), desc(task.createdAt))
    .limit(400);
}

/** Próximos prazos das tarefas ainda abertas, ordenados por vencimento. */
export async function listUpcomingTasks(tenantId: string, limit = 8) {
  return db
    .select()
    .from(task)
    .where(
      and(
        eq(task.tenantId, tenantId),
        isNotNull(task.dueDate),
        sql`${task.status} in ('a_fazer','em_andamento')`,
      ),
    )
    .orderBy(asc(task.dueDate))
    .limit(limit);
}

export async function taskSummary(tenantId: string) {
  const today = new Date().toISOString().slice(0, 10);
  const r = await db
    .select({
      todo: sql<string>`count(*) filter (where ${task.status} = 'a_fazer')`,
      doing: sql<string>`count(*) filter (where ${task.status} = 'em_andamento')`,
      done: sql<string>`count(*) filter (where ${task.status} = 'concluida')`,
      overdue: sql<string>`count(*) filter (where ${task.status} in ('a_fazer','em_andamento') and ${task.dueDate} is not null and ${task.dueDate} < ${today})`,
      total: sql<string>`count(*)`,
    })
    .from(task)
    .where(eq(task.tenantId, tenantId));
  return {
    todo: Number(r[0]?.todo ?? 0),
    doing: Number(r[0]?.doing ?? 0),
    done: Number(r[0]?.done ?? 0),
    overdue: Number(r[0]?.overdue ?? 0),
    total: Number(r[0]?.total ?? 0),
  };
}

export type TaskInput = {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string | null;
  dueDate: string | null;
  entityType: TaskEntityType;
  entityId: string;
};

/** Resolve o rótulo do vínculo (Marca / Licenciado) validando o tenant. */
async function resolveEntityLabel(
  tenantId: string,
  entityType: TaskEntityType,
  entityId: string,
): Promise<string | null> {
  if (entityType === "marca") {
    const r = await db
      .select({ name: brand.name })
      .from(brand)
      .where(and(eq(brand.id, entityId), eq(brand.tenantId, tenantId)))
      .limit(1);
    if (!r[0]) throw new Error("Marca inválida no vínculo.");
    return `Marca · ${r[0].name}`;
  }
  const r = await db
    .select({ name: licensee.legalName })
    .from(licensee)
    .where(and(eq(licensee.id, entityId), eq(licensee.tenantId, tenantId)))
    .limit(1);
  if (!r[0]) throw new Error("Licenciado inválido no vínculo.");
  return `Licenciado · ${r[0].name}`;
}

export async function createTask(
  tenantId: string,
  input: TaskInput,
  userId: string,
): Promise<{ id: string }> {
  const entityLabel = await resolveEntityLabel(tenantId, input.entityType, input.entityId);
  const inserted = await db
    .insert(task)
    .values({
      tenantId,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      assignee: input.assignee,
      dueDate: input.dueDate,
      completedAt: input.status === "concluida" ? new Date().toISOString().slice(0, 10) : null,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel,
      createdBy: userId,
    })
    .returning({ id: task.id });
  return { id: inserted[0].id };
}

const TASK_STATUS_VALUES = ["a_fazer", "em_andamento", "concluida", "cancelada"] as const;

export async function setTaskStatus(
  tenantId: string,
  id: string,
  status: TaskStatus,
): Promise<void> {
  if (!(TASK_STATUS_VALUES as readonly string[]).includes(status)) return;
  await db
    .update(task)
    .set({
      status,
      completedAt: status === "concluida" ? new Date().toISOString().slice(0, 10) : null,
      updatedAt: new Date(),
    })
    .where(and(eq(task.id, id), eq(task.tenantId, tenantId)));
}
