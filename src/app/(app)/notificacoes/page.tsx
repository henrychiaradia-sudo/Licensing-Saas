import Link from "next/link";
import {
  Bell,
  FileText,
  Landmark,
  Microscope,
  ListTodo,
  Gavel,
  Check,
  CheckCheck,
  Mail,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listNotifications, generateNotifications } from "@/lib/data/notifications";
import { markReadAction, markAllReadAction } from "./actions";
import { Card, Badge, Button } from "@/components/ui";
import type { NotificationType } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

const typeIcon: Record<NotificationType, React.ReactNode> = {
  contract_expiring: <FileText size={16} className="text-amber-500" />,
  receivable_overdue: <Landmark size={16} className="text-red-500" />,
  quality_nc: <Microscope size={16} className="text-red-500" />,
  task_overdue: <ListTodo size={16} className="text-amber-500" />,
  legal_deadline: <Gavel size={16} className="text-amber-500" />,
  system: <Bell size={16} className="text-blue-500" />,
};

const severityTone: Record<string, Tone> = {
  info: "info",
  warn: "warn",
  danger: "danger",
  success: "good",
};
const severityLabel: Record<string, string> = {
  info: "Informativo",
  warn: "Atenção",
  danger: "Urgente",
  success: "OK",
};

function fmtWhen(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function NotificacoesPage() {
  const session = await requireSession();
  // Gera notificações a partir dos sinais reais a cada visita (idempotente por dedupe).
  await generateNotifications(session.tenantId);
  const items = await listNotifications(session.tenantId);
  const unread = items.filter((n) => !n.readAt);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Notificações</h1>
          <p className="text-sm text-neutral-500">
            Alertas gerados dos dados reais do sistema — {unread.length} não lida(s)
          </p>
        </div>
        {unread.length > 0 && (
          <form action={markAllReadAction}>
            <Button type="submit" variant="outline">
              <CheckCheck size={15} /> Marcar todas como lidas
            </Button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-neutral-400">
          <Bell size={28} className="mx-auto mb-3 text-neutral-300" />
          Nenhuma notificação no momento. Tudo em dia.
        </Card>
      ) : (
        <Card className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 ${n.readAt ? "opacity-60" : "bg-blue-50/40 dark:bg-blue-950/10"}`}
            >
              <div className="mt-0.5">{typeIcon[n.type as NotificationType]}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{n.title}</span>
                  <Badge tone={severityTone[n.severity] ?? "neutral"}>
                    {severityLabel[n.severity] ?? n.severity}
                  </Badge>
                  {!n.readAt && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                  {n.emailedAt && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
                      <Mail size={11} /> e-mail enviado
                    </span>
                  )}
                </div>
                {n.body && <p className="mt-0.5 text-sm text-neutral-500">{n.body}</p>}
                <div className="mt-1 flex items-center gap-3 text-[11px] text-neutral-400">
                  <span className="tabular-nums">{fmtWhen(n.createdAt)}</span>
                  {n.link && (
                    <Link href={n.link} className="text-blue-600 hover:underline">
                      Ver detalhe
                    </Link>
                  )}
                </div>
              </div>
              {!n.readAt && (
                <form action={markReadAction.bind(null, n.id)}>
                  <Button type="submit" size="sm" variant="ghost" title="Marcar como lida">
                    <Check size={14} />
                  </Button>
                </form>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
