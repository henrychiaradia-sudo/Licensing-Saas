import Link from "next/link";
import { Plus, TrendingUp, Target, Layers, Trophy } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listOpportunities, pipelineSummary } from "@/lib/data/opportunities";
import { Button, Card, Badge } from "@/components/ui";
import { fmtCompactBRL, fmtBRL, fmtDate } from "@/lib/utils";
import type { OpportunityStage } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

export const stageTone: Record<OpportunityStage, Tone> = {
  prospeccao: "neutral",
  qualificacao: "info",
  proposta: "warn",
  negociacao: "warn",
  ganho: "good",
  perdido: "danger",
};
export const stageLabel: Record<OpportunityStage, string> = {
  prospeccao: "Prospecção",
  qualificacao: "Qualificação",
  proposta: "Proposta",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};

const BOARD_STAGES: OpportunityStage[] = [
  "prospeccao",
  "qualificacao",
  "proposta",
  "negociacao",
  "ganho",
  "perdido",
];

export default async function PipelinePage() {
  const session = await requireSession();
  const [rows, summary] = await Promise.all([
    listOpportunities(session.tenantId),
    pipelineSummary(session.tenantId),
  ]);

  const byStage = (stage: OpportunityStage) => rows.filter((r) => r.stage === stage);
  const stageValue = (stage: OpportunityStage) =>
    byStage(stage).reduce((a, r) => a + Number(r.estimatedValue), 0);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Pipeline de Licenciamento</h1>
          <p className="text-sm text-neutral-500">
            Funil de oportunidades — do primeiro contato ao licenciado
          </p>
        </div>
        <Link href="/pipeline/new">
          <Button>
            <Plus size={16} /> Nova oportunidade
          </Button>
        </Link>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Pipeline aberto"
          value={fmtCompactBRL(Number(summary.openValue))}
          icon={<Layers size={16} className="text-blue-500" />}
        />
        <Kpi
          label="Forecast ponderado"
          value={fmtCompactBRL(Number(summary.weighted))}
          icon={<Target size={16} className="text-emerald-500" />}
        />
        <Kpi
          label="Oportunidades abertas"
          value={String(summary.openCount)}
          icon={<TrendingUp size={16} className="text-neutral-400" />}
        />
        <Kpi
          label="Taxa de ganho"
          value={summary.winRate != null ? `${summary.winRate}%` : "—"}
          icon={<Trophy size={16} className="text-amber-500" />}
        />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {BOARD_STAGES.map((stage) => {
          const cards = byStage(stage);
          return (
            <div key={stage} className="w-72 shrink-0">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Badge tone={stageTone[stage]}>{stageLabel[stage]}</Badge>
                  <span className="text-neutral-400">{cards.length}</span>
                </span>
                <span className="text-xs tabular-nums text-neutral-400">
                  {fmtCompactBRL(stageValue(stage))}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {cards.map((o) => (
                  <Link
                    key={o.id}
                    href={`/pipeline/${o.id}`}
                    className="block rounded-lg border border-neutral-200 bg-white p-3 hover:border-blue-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-900"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-neutral-400">{o.opportunityNumber}</span>
                      <span className="text-[11px] tabular-nums text-neutral-400">{o.probability}%</span>
                    </div>
                    <div className="mt-0.5 text-sm font-semibold leading-snug">{o.name}</div>
                    {o.companyName && (
                      <div className="text-xs text-neutral-500">{o.companyName}</div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-bold tabular-nums text-emerald-600">
                        {fmtBRL(Number(o.estimatedValue))}
                      </span>
                      {o.brandName && (
                        <span className="truncate text-[11px] text-neutral-400">{o.brandName}</span>
                      )}
                    </div>
                    {o.expectedCloseDate && (
                      <div className="mt-1 text-[11px] text-neutral-400">
                        Fecha em {fmtDate(o.expectedCloseDate)}
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
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
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
