import Link from "next/link";
import { Plus, Wallet, TrendingUp, Megaphone, Layers } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listCampaigns, marketingSummary } from "@/lib/data/marketing";
import { Button, Card, Badge } from "@/components/ui";
import { fmtCompactBRL, fmtBRL, fmtDate } from "@/lib/utils";
import type { CampaignStatus, CampaignType } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

export const campaignStatusTone: Record<CampaignStatus, Tone> = {
  planejamento: "neutral",
  ativa: "good",
  pausada: "warn",
  concluida: "info",
  cancelada: "danger",
};
export const campaignStatusLabel: Record<CampaignStatus, string> = {
  planejamento: "Planejamento",
  ativa: "Ativa",
  pausada: "Pausada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};
export const campaignTypeLabel: Record<CampaignType, string> = {
  lancamento: "Lançamento",
  sazonal: "Sazonal",
  promocional: "Promocional",
  institucional: "Institucional",
  cobranding: "Co-branding",
};

const BOARD: CampaignStatus[] = ["planejamento", "ativa", "pausada", "concluida", "cancelada"];

export default async function MarketingPage() {
  const session = await requireSession();
  const [rows, summary] = await Promise.all([
    listCampaigns(session.tenantId),
    marketingSummary(session.tenantId),
  ]);

  const byStatus = (s: CampaignStatus) => rows.filter((r) => r.status === s);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Marketing &amp; Trade</h1>
          <p className="text-sm text-neutral-500">Campanhas, orçamento e ativações de trade marketing</p>
        </div>
        <Link href="/marketing/new">
          <Button>
            <Plus size={16} /> Nova campanha
          </Button>
        </Link>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Orçamento total" value={fmtCompactBRL(Number(summary.budget))} icon={<Wallet size={16} className="text-blue-500" />} />
        <Kpi label="Gasto" value={fmtCompactBRL(Number(summary.spent))} hint={`${summary.usage}% do orçamento`} icon={<TrendingUp size={16} className="text-emerald-500" />} />
        <Kpi label="Campanhas ativas" value={String(summary.active)} icon={<Megaphone size={16} className="text-amber-500" />} />
        <Kpi label="Total de campanhas" value={String(summary.total)} icon={<Layers size={16} className="text-neutral-400" />} />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {BOARD.map((status) => {
          const cards = byStatus(status);
          return (
            <div key={status} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Badge tone={campaignStatusTone[status]}>{campaignStatusLabel[status]}</Badge>
                  <span className="text-neutral-400">{cards.length}</span>
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {cards.map((c) => (
                  <Link
                    key={c.id}
                    href={`/marketing/${c.id}`}
                    className="block rounded-lg border border-neutral-200 bg-white p-3 hover:border-blue-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-neutral-400">{c.campaignNumber}</span>
                      <span className="text-[11px] text-neutral-400">{campaignTypeLabel[c.campaignType]}</span>
                    </div>
                    <div className="mt-0.5 text-sm font-semibold leading-snug">{c.name}</div>
                    {c.brandName && <div className="text-xs text-neutral-500">{c.brandName}</div>}
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="tabular-nums text-neutral-500">
                        {fmtBRL(Number(c.spent))} / {fmtBRL(Number(c.budget))}
                      </span>
                    </div>
                    {c.startDate && (
                      <div className="mt-1 text-[11px] text-neutral-400">
                        {fmtDate(c.startDate)}
                        {c.endDate ? ` → ${fmtDate(c.endDate)}` : ""}
                      </div>
                    )}
                  </Link>
                ))}
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

function Kpi({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-neutral-400">{hint}</div>}
    </Card>
  );
}
