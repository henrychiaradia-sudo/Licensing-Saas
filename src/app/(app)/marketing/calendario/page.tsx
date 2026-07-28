import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { actionsInRange } from "@/lib/data/marketing-analytics";
import { Card, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import { MarketingNav } from "../nav";
import { actionTypeLabel, actionStatusTone, actionStatusLabel } from "../labels";
import type { MarketingActionType } from "@/lib/db/schema";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const TYPE_COLOR: Record<MarketingActionType, string> = {
  ativacao: "#2563eb",
  evento: "#8b5cf6",
  influenciador: "#ec4899",
  patrocinio: "#f59e0b",
  conteudo: "#06b6d4",
  midia_paga: "#ef4444",
  midia_espontanea: "#10b981",
  redes_sociais: "#0ea5e9",
  promocao: "#84cc16",
  producao: "#a855f7",
  pdv: "#14b8a6",
  outro: "#6b7280",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireSession();

  const now = new Date();
  const match = sp.month && /^\d{4}-\d{2}$/.test(sp.month) ? sp.month : null;
  const year = match ? Number(match.slice(0, 4)) : now.getFullYear();
  const month = match ? Number(match.slice(5, 7)) - 1 : now.getMonth(); // 0-based

  const ym = `${year}-${pad(month + 1)}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = new Date(year, month, 1).getDay();
  const nextMonthDate = new Date(year, month + 1, 1);
  const prevMonthDate = new Date(year, month - 1, 1);
  const nextYm = `${nextMonthDate.getFullYear()}-${pad(nextMonthDate.getMonth() + 1)}`;
  const prevYm = `${prevMonthDate.getFullYear()}-${pad(prevMonthDate.getMonth() + 1)}`;
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const rows = await actionsInRange(session.tenantId, `${ym}-01`, `${nextYm}-01`);
  const byDay = new Map<string, typeof rows>();
  for (const a of rows) {
    if (!a.startDate) continue;
    const key = a.startDate.slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(a);
  }

  // Monta as células (blanks iniciais + dias)
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold">Calendário de marketing</h1>
        <p className="text-sm text-neutral-500">Ativações, eventos, mídia e conteúdo por data.</p>
      </div>

      <MarketingNav />

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {MESES[month]} <span className="text-neutral-400">{year}</span>
        </h2>
        <div className="flex items-center gap-2">
          <Link
            href={`/marketing/calendario?month=${prevYm}`}
            className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 text-neutral-500 hover:border-blue-400 hover:text-blue-600 dark:border-neutral-700"
            aria-label="Mês anterior"
          >
            <ChevronLeft size={16} />
          </Link>
          <Link
            href="/marketing/calendario"
            className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:border-blue-400 hover:text-blue-600 dark:border-neutral-700 dark:text-neutral-300"
          >
            Hoje
          </Link>
          <Link
            href={`/marketing/calendario?month=${nextYm}`}
            className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 text-neutral-500 hover:border-blue-400 hover:text-blue-600 dark:border-neutral-700"
            aria-label="Próximo mês"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <Card className="p-3">
        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-1 text-center text-[11px] font-semibold uppercase text-neutral-400">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`b${idx}`} className="min-h-24 rounded-lg" />;
            const key = `${ym}-${pad(day)}`;
            const items = byDay.get(key) ?? [];
            const isToday = key === todayStr;
            return (
              <div
                key={key}
                className={`min-h-24 rounded-lg border p-1.5 ${
                  isToday
                    ? "border-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
                    : "border-neutral-100 dark:border-neutral-800"
                }`}
              >
                <div
                  className={`mb-1 text-xs font-semibold ${isToday ? "text-blue-600" : "text-neutral-400"}`}
                >
                  {day}
                </div>
                <div className="space-y-1">
                  {items.slice(0, 3).map((a) => (
                    <Link
                      key={a.id}
                      href={`/marketing/acoes/${a.id}`}
                      className="flex items-center gap-1 rounded px-1 py-0.5 text-[10.5px] leading-tight hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      title={`${a.name} · ${actionTypeLabel[a.actionType]}`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: TYPE_COLOR[a.actionType] }}
                      />
                      <span className="truncate">{a.name}</span>
                    </Link>
                  ))}
                  {items.length > 3 && (
                    <div className="px-1 text-[10px] text-neutral-400">+{items.length - 3} mais</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold">Agenda do mês</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma ação agendada em {MESES[month]}.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <Link href={`/marketing/acoes/${a.id}`} className="flex min-w-0 items-center gap-2.5 hover:text-blue-600">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: TYPE_COLOR[a.actionType] }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{a.name}</span>
                    <span className="block text-xs text-neutral-500">
                      {actionTypeLabel[a.actionType]}
                      {a.channel ? ` · ${a.channel}` : ""}
                    </span>
                  </span>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={actionStatusTone[a.status]}>{actionStatusLabel[a.status]}</Badge>
                  <span className="w-20 text-right text-xs tabular-nums text-neutral-500">
                    {fmtDate(a.startDate)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
