import { z } from "zod";

export const TASK_STATUS = ["a_fazer", "em_andamento", "concluida", "cancelada"] as const;
export const TASK_PRIORITY = ["baixa", "media", "alta", "urgente"] as const;

export const taskSchema = z.object({
  title: z.string().trim().min(2, "Informe o título da tarefa.").max(200),
  description: z.string().trim().max(1000).nullable(),
  status: z.enum(TASK_STATUS),
  priority: z.enum(TASK_PRIORITY),
  assignee: z.string().trim().max(160).nullable(),
  dueDate: z.string().nullable(),
  entityLabel: z.string().trim().max(200).nullable(),
});
