"use server";

import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { createTask, setTaskStatus, type TaskInput } from "@/lib/data/tasks";
import { logAudit } from "@/lib/data/audit";
import { taskSchema, TASK_STATUS } from "./schema";
import type { TaskStatus } from "@/lib/db/schema";

export type FormState = { error: string | null };

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}

function canWriteTasks(session: Parameters<typeof can>[0]) {
  return session.isInternal || can(session, PERMISSIONS.contractWrite);
}

export async function createTaskAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteTasks(session)) {
    return { error: "Você não tem permissão para gerenciar tarefas." };
  }
  const entityType = String(formData.get("entityType") ?? "");
  const entityId =
    entityType === "marca"
      ? emptyToNull(formData.get("brandId"))
      : entityType === "licenciado"
        ? emptyToNull(formData.get("licenseeId"))
        : null;
  const candidate = {
    title: String(formData.get("title") ?? "").trim(),
    description: emptyToNull(formData.get("description")),
    status: String(formData.get("status") ?? "a_fazer"),
    priority: String(formData.get("priority") ?? "media"),
    assignee: emptyToNull(formData.get("assignee")),
    dueDate: emptyToNull(formData.get("dueDate")),
    entityType,
    entityId: entityId ?? "",
  };
  const parsed = taskSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input: TaskInput = parsed.data;
  let id: string;
  try {
    id = (await createTask(session.tenantId, input, session.userId)).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar a tarefa." };
  }
  await logAudit(
    session.tenantId,
    session.userId,
    "task.create",
    "task",
    id,
    `Tarefa "${input.title}" criada`,
  );
  revalidatePath("/tarefas");
  return { error: null };
}

export async function setTaskStatusAction(id: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!canWriteTasks(session)) return;
  const status = String(formData.get("status") ?? "");
  if (!(TASK_STATUS as readonly string[]).includes(status)) return;
  await setTaskStatus(session.tenantId, id, status as TaskStatus);
  await logAudit(
    session.tenantId,
    session.userId,
    "task.status",
    "task",
    id,
    `Tarefa → ${status}`,
  );
  revalidatePath("/tarefas");
}
