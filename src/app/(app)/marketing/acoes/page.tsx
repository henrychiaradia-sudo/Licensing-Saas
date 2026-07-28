import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listActions, roiPct } from "@/lib/data/marketing";
import { Button, Card, Badge } from "@/components/ui";
import { fmtBRL, fmtCompactBRL, fmtDate, fmtPct } from "@/lib/utils";
import { MarketingNav } from "../nav";
import {
  actionTypeLabel,
  actionStatusTone,
  actionStatusLabel,
  ACTION_TYPE_OPTIONS,
  ACTION_STATUS_OPTIONS,
} from "../labels";
import type { MarketingActionType, MarketingActionStatus } from "@/lib/db/schema";

export default async function ActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireSession();
  const type = (ACTION_TYPE_OPTIONS.find((o) => o.value === sp.type)?.value ?? undefined) as
    | MarketingActionType
    | undefined;
  const status = (ACTION_STATUS_OPTIONS.find((o) => o.value === sp.status)?.value ?? undefined) as
    | MarketingActionStatus
    | undefined;
  const rows = await listActions(session.tenantId, { q: sp.q, type, status });

  const totalSpent = rows.reduce((s, r) => s + Number(r.spent), 0);
  const totalRevenue = rows.reduce((s, r) => s + Number(r.revenue), 0);
  const roi = roiPct(totalSpent, totalRevenue);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Ações & táticas</h1>
          <p className="text-sm text-neutral-500">
            Ativações, eventos, influenciadores, patrocínios, mídia, conteúdo, promoções e mais.
          </p>
        </div>
        <Link href="/marketing/acoes/nova">
          <Button>
            <Plus size={16} /> Nova ação
          </Button>
        </Link>
      </div>

      <MarketingNav />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Mini label="Ações" value={String(rows.length)} />
        <Mini label="Realizado" value={fmtCompactBRL(totalSpent)} />
        <Mini label="Receita" value={fmtCompactBRL(totalRevenue)} />
        <Mini label="ROI" value={roi != null ? fmtPct(roi) : "—"} />
      </div>

      <form className="mb-4 flex flex-wrap gap-2" action="/marketing/acoes">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Buscar por nome ou canal…"
          className="h-9 w-60 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <select
          name="type"
          defaultValue={sp.type ?? ""}
          className="h-9 rounded-lg border border-neutral-200 px-3 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="">Todas as táticas</option>
          {ACTION_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="h-9 rounded-lg border border-neutral-200 px-3 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="">Todos os status</option>
          {ACTION_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Filtrar
        </Button>
      </form>

      <Card className="p-0">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-400">Nenhuma ação encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th className="px-4 py-2.5 font-medium">Ação</th>
                  <th className="px-4 py-2.5 font-medium">Tática</th>
                  <th className="px-4 py-2.5 font-medium">Campanha</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Data</th>
                  <th className="px-4 py-2.5 text-right font-medium">Gasto</th>
                  <th className="px-4 py-2.5 text-right font-medium">Receita</th>
                  <th className="px-4 py-2.5 text-right font-medium">ROI</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const spent = Number(a.spent);
                  const rev = Number(a.revenue);
                  const r = roiPct(spent, rev);
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40"
                    >
                      <td className="px-4 py-2.5 font-medium">
                        <Link href={`/marketing/acoes/${a.id}`} className="hover:text-blue-600">
                          {a.name}
                        </Link>
                        {a.coop && (
                          <span className="ml-2 text-[10px] font-semibold uppercase text-emerald-600">
                            coop
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-neutral-500">{actionTypeLabel[a.actionType]}</td>
                      <td className="px-4 py-2.5 text-neutral-500">
                        {a.campaignName ? (
                          <Link
                            href={`/marketing/campanhas/${a.campaignId}`}
                            className="hover:text-blue-600"
                          >
                            {a.campaignName}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge tone={actionStatusTone[a.status]}>{actionStatusLabel[a.status]}</Badge>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-neutral-500">{fmtDate(a.startDate)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtBRL(spent)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtBRL(rev)}</td>
                      <td className="px-4 py-2.5 text-right">
                        {r != null ? (
                          <span className={r >= 0 ? "text-emerald-600" : "text-red-600"}>{fmtPct(r)}</span>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div className="mt-1.5 text-xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}
