import { CalendarClock, ListTodo, Loader2, CheckCircle2, AlertTriangle, Play, Undo2, CircleCheck } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listTasks, listUpcomingTasks, taskSummary } from "@/lib/data/tasks";
import { setTaskStatusAction } from "./actions";
import { TaskForm } from "./task-form";
import { Card, Badge, Button } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import type { TaskStatus, TaskPriority } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";
type TaskRow = Awaited<ReturnType<typeof listTasks>>[number];

const priorityTone: Record<TaskPriority, Tone> = {
  baixa: "neutral",
  media: "info",
  alta: "warn",
  urgente: "danger",
};
const priorityLabel: Record<TaskPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  urgente: "Urgente",
};
const statusLabel: Record<TaskStatus, string> = {
  a_fazer: "A fazer",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};
const statusTone: Record<TaskStatus, Tone> = {
  a_fazer: "neutral",
  em_andamento: "warn",
  concluida: "good",
  cancelada: "danger",
};

const BOARD: TaskStatus[] = ["a_fazer", "em_andamento", "concluida"];

// Ações rápidas de status disponíveis em cada card.
const CARD_ACTIONS: Record<
  TaskStatus,
  { value: TaskStatus; label: string; icon: React.ReactNode; variant?: "primary" | "outline" }[]
> = {
  a_fazer: [{ value: "em_andamento", label: "Iniciar", icon: <Play size={12} /> }],
  em_andamento: [{ value: "concluida", label: "Concluir", icon: <CircleCheck size={12} /> }],
  concluida: [{ value: "a_fazer", label: "Reabrir", icon: <Undo2 size={12} />, variant: "outline" }],
  cancelada: [],
};

export default async function TarefasPage() {
  const session = await requireSession();
  const [rows, upcoming, summary] = await Promise.all([
    listTasks(session.tenantId),
    listUpcomingTasks(session.tenantId),
    taskSummary(session.tenantId),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (t: TaskRow) =>
    !!t.dueDate && t.dueDate < today && (t.status === "a_fazer" || t.status === "em_andamento");
  const byStatus = (s: TaskStatus) => rows.filter((r) => r.status === s);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Cronogramas &amp; Tarefas</h1>
        <p className="text-sm text-neutral-500">Tarefas com prazo, responsável e prioridade</p>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="A fazer" value={String(summary.todo)} icon={<ListTodo size={16} className="text-neutral-400" />} />
        <Kpi label="Em andamento" value={String(summary.doing)} icon={<Loader2 size={16} className="text-amber-500" />} />
        <Kpi label="Atrasadas" value={String(summary.overdue)} icon={<AlertTriangle size={16} className="text-red-500" />} />
        <Kpi label="Concluídas" value={String(summary.done)} icon={<CheckCircle2 size={16} className="text-emerald-500" />} />
      </div>

      <Card className="mb-5 p-5">
        <h2 className="mb-3 text-sm font-semibold">Nova tarefa</h2>
        <TaskForm />
      </Card>

      {upcoming.length > 0 && (
        <Card className="mb-5 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CalendarClock size={16} className="text-blue-500" /> Próximos prazos
          </h2>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {upcoming.map((t) => {
              const overdue = isOverdue(t);
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <Badge tone={priorityTone[t.priority as TaskPriority]}>
                      {priorityLabel[t.priority as TaskPriority]}
                    </Badge>
                    <span className="font-medium">{t.title}</span>
                    {t.assignee && <span className="text-xs text-neutral-400">· {t.assignee}</span>}
                  </span>
                  <span className={overdue ? "text-sm font-semibold text-red-600" : "tabular-nums text-neutral-500"}>
                    {fmtDate(t.dueDate)}
                    {overdue ? " · atrasada" : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="flex gap-4 overflow-x-auto pb-2">
        {BOARD.map((status) => {
          const cards = byStatus(status);
          return (
            <div key={status} className="w-80 shrink-0">
              <div className="mb-2 flex items-center gap-2 px-1">
                <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>
                <span className="text-sm text-neutral-400">{cards.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {cards.map((t) => {
                  const overdue = isOverdue(t);
                  return (
                    <div
                      key={t.id}
                      className="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold leading-snug">{t.title}</span>
                        <Badge tone={priorityTone[t.priority as TaskPriority]}>
                          {priorityLabel[t.priority as TaskPriority]}
                        </Badge>
                      </div>
                      {t.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{t.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-400">
                        {t.assignee && <span>{t.assignee}</span>}
                        {t.dueDate && (
                          <span className={overdue ? "font-semibold text-red-600" : ""}>
                            {fmtDate(t.dueDate)}
                            {overdue ? " · atrasada" : ""}
                          </span>
                        )}
                        {t.entityLabel && <span>· {t.entityLabel}</span>}
                      </div>
                      {CARD_ACTIONS[status].length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {CARD_ACTIONS[status].map((a) => (
                            <form key={a.value} action={setTaskStatusAction.bind(null, t.id)}>
                              <input type="hidden" name="status" value={a.value} />
                              <Button type="submit" size="sm" variant={a.variant ?? "primary"}>
                                {a.icon} {a.label}
                              </Button>
                            </form>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <div className="rounded-lg border border-dashed border-neutral-200 p-4 text-center text-xs text-neutral-400 dark:border-neutral-800">
                    Vazio
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}
