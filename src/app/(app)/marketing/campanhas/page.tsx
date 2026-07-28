import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listCampaigns, marketingSummary, roiPct } from "@/lib/data/marketing";
import { Button, Card, Badge } from "@/components/ui";
import { fmtBRL, fmtCompactBRL, fmtDate, fmtPct } from "@/lib/utils";
import { MarketingNav } from "../nav";
import {
  campaignStatusTone,
  campaignStatusLabel,
  campaignTypeLabel,
  CAMPAIGN_STATUS_OPTIONS,
} from "../labels";
import type { CampaignStatus } from "@/lib/db/schema";

const BOARD: CampaignStatus[] = ["planejamento", "ativa", "pausada", "concluida", "cancelada"];

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireSession();
  const status = (CAMPAIGN_STATUS_OPTIONS.find((o) => o.value === sp.status)?.value ??
    undefined) as CampaignStatus | undefined;
  const [rows, summary] = await Promise.all([
    listCampaigns(session.tenantId, { q: sp.q, status }),
    marketingSummary(session.tenantId),
  ]);
  const byStatus = (s: CampaignStatus) => rows.filter((r) => r.status === s);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Campanhas</h1>
          <p className="text-sm text-neutral-500">Planeje, execute e acompanhe orçamento, ações e ROI.</p>
        </div>
        <Link href="/marketing/campanhas/nova">
          <Button>
            <Plus size={16} /> Nova campanha
          </Button>
        </Link>
      </div>

      <MarketingNav />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Mini label="Orçamento" value={fmtCompactBRL(summary.budget)} />
        <Mini label="Realizado" value={fmtCompactBRL(summary.spent)} hint={`${summary.usage}%`} />
        <Mini label="Receita" value={fmtCompactBRL(summary.revenue)} />
        <Mini label="ROI global" value={summary.roi != null ? fmtPct(summary.roi) : "—"} />
      </div>

      <form className="mb-4 flex flex-wrap gap-2" action="/marketing/campanhas">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Buscar por nome ou número…"
          className="h-9 w-64 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="h-9 rounded-lg border border-neutral-200 px-3 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="">Todos os status</option>
          {CAMPAIGN_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Filtrar
        </Button>
      </form>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {BOARD.map((s) => {
          const cards = byStatus(s);
          return (
            <div key={s} className="w-72 shrink-0">
              <div className="mb-2 flex items-center gap-2 px-1">
                <Badge tone={campaignStatusTone[s]}>{campaignStatusLabel[s]}</Badge>
                <span className="text-sm text-neutral-400">{cards.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {cards.map((c) => {
                  const spent = Number(c.spent);
                  const budget = Number(c.budget);
                  const revenue = Number(c.revenue);
                  const roi = roiPct(spent, revenue);
                  return (
                    <Link
                      key={c.id}
                      href={`/marketing/campanhas/${c.id}`}
                      className="block rounded-lg border border-neutral-200 bg-white p-3 hover:border-blue-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-neutral-400">{c.campaignNumber}</span>
                        <span className="text-[11px] text-neutral-400">
                          {campaignTypeLabel[c.campaignType]}
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm font-semibold leading-snug">{c.name}</div>
                      {c.brandName && <div className="text-xs text-neutral-500">{c.brandName}</div>}
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="tabular-nums text-neutral-500">
                          {fmtBRL(spent)} / {fmtBRL(budget)}
                        </span>
                        {roi != null && (
                          <Badge tone={roi >= 0 ? "good" : "danger"} className="px-1.5 py-0">
                            {fmtPct(roi)}
                          </Badge>
                        )}
                      </div>
                      {c.coop && (
                        <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-emerald-600">
                          Cooperado
                        </div>
                      )}
                      {c.startDate && (
                        <div className="mt-1 text-[11px] text-neutral-400">
                          {fmtDate(c.startDate)}
                          {c.endDate ? ` → ${fmtDate(c.endDate)}` : ""}
                        </div>
                      )}
                    </Link>
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

function Mini({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div className="mt-1.5 text-xl font-bold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-neutral-400">{hint}</div>}
    </Card>
  );
}
