import Link from "next/link";
import { Bell, Check, CheckCheck, Mail, Webhook, MonitorSmartphone, SlidersHorizontal } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listNotifications, generateNotifications, countsByType } from "@/lib/data/notifications";
import { markReadAction, markAllReadAction } from "./actions";
import { Card, Badge, Button } from "@/components/ui";
import { NotifIcon } from "@/components/notif-icons";
import { NOTIF_LABEL, SEVERITY_LABEL, SEVERITY_TONE, type NotifTone } from "@/lib/notif-meta";

function fmtWhen(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function ChannelChips({ channels, emailed }: { channels: string | null; emailed: boolean }) {
  const set = new Set((channels ?? "in_app").split(",").map((s) => s.trim()).filter(Boolean));
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {set.has("in_app") && (
        <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
          <MonitorSmartphone size={10} /> In-app
        </span>
      )}
      {set.has("email") && (
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-950/40">
          <Mail size={10} /> {emailed ? "E-mail enviado" : "E-mail"}
        </span>
      )}
      {set.has("webhook") && (
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-medium text-violet-600 dark:bg-violet-950/40">
          <Webhook size={10} /> Webhook
        </span>
      )}
    </span>
  );
}

export default async function NotificacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;
  const filterType = sp.tipo && sp.tipo !== "todas" ? sp.tipo : undefined;

  // Gera notificações dos sinais reais a cada visita (idempotente por dedupe).
  await generateNotifications(session.tenantId);
  const [items, counts] = await Promise.all([
    listNotifications(session.tenantId, { type: filterType }),
    countsByType(session.tenantId),
  ]);
  const unread = items.filter((n) => !n.readAt);
  const totalUnread = counts.reduce((s, c) => s + c.unread, 0);
  const activeFilters = counts.slice().sort((a, b) => b.unread - a.unread || b.total - a.total);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Notificações</h1>
          <p className="text-sm text-neutral-500">
            Alertas gerados dos dados reais do sistema — {totalUnread} não lida(s) no total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/notificacoes/preferencias">
            <Button variant="outline">
              <SlidersHorizontal size={15} /> Preferências
            </Button>
          </Link>
          {unread.length > 0 && (
            <form action={markAllReadAction}>
              <Button type="submit" variant="outline">
                <CheckCheck size={15} /> Marcar lidas
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Filtros por evento */}
      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href="/notificacoes"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            !filterType
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-neutral-200 text-neutral-600 hover:border-blue-400 dark:border-neutral-700 dark:text-neutral-300"
          }`}
        >
          Todas
        </Link>
        {activeFilters.map((c) => (
          <Link
            key={c.type}
            href={`/notificacoes?tipo=${c.type}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
              filterType === c.type
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-neutral-200 text-neutral-600 hover:border-blue-400 dark:border-neutral-700 dark:text-neutral-300"
            }`}
          >
            <NotifIcon type={c.type} size={12} />
            {NOTIF_LABEL[c.type] ?? c.type}
            <span className={`tabular-nums ${filterType === c.type ? "text-white/80" : "text-neutral-400"}`}>
              {c.unread > 0 ? c.unread : c.total}
            </span>
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <Card className="p-10 text-center text-sm text-neutral-400">
          <Bell size={28} className="mx-auto mb-3 text-neutral-300" />
          Nenhuma notificação {filterType ? "deste tipo" : "no momento"}. Tudo em dia.
        </Card>
      ) : (
        <Card className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {items.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 p-4 ${n.readAt ? "opacity-60" : "bg-blue-50/40 dark:bg-blue-950/10"}`}
            >
              <div className="mt-0.5">
                <NotifIcon
                  type={n.type}
                  className={
                    (SEVERITY_TONE[n.severity] as NotifTone) === "danger"
                      ? "text-red-500"
                      : (SEVERITY_TONE[n.severity] as NotifTone) === "warn"
                        ? "text-amber-500"
                        : "text-blue-500"
                  }
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{n.title}</span>
                  <Badge tone={SEVERITY_TONE[n.severity] ?? "neutral"}>
                    {SEVERITY_LABEL[n.severity] ?? n.severity}
                  </Badge>
                  {!n.readAt && <span className="h-2 w-2 rounded-full bg-blue-500" />}
                </div>
                {n.body && <p className="mt-0.5 text-sm text-neutral-500">{n.body}</p>}
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-neutral-400">
                  <span className="tabular-nums">{fmtWhen(n.createdAt)}</span>
                  <ChannelChips channels={n.channels} emailed={!!n.emailedAt} />
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
