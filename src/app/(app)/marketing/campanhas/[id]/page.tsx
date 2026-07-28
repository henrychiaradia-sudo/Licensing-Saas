import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Pencil,
  Plus,
  Target,
  ExternalLink,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getCampaignDetail, roiPct } from "@/lib/data/marketing";
import { setCampaignStatusAction } from "../../actions";
import { KpiForm } from "../kpi-form";
import { Card, Badge, Button } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { ProgressBar } from "@/components/charts";
import { fmtBRL, fmtDate, fmtPct } from "@/lib/utils";
import {
  campaignStatusTone,
  campaignStatusLabel,
  campaignTypeLabel,
  actionTypeLabel,
  actionStatusTone,
  actionStatusLabel,
} from "../../labels";
import type { CampaignStatus } from "@/lib/db/schema";

const STATUS_ACTIONS: Record<
  CampaignStatus,
  { value: CampaignStatus; label: string; icon: React.ReactNode; variant?: "primary" | "outline" | "danger" }[]
> = {
  planejamento: [{ value: "ativa", label: "Ativar", icon: <Play size={14} /> }],
  ativa: [
    { value: "pausada", label: "Pausar", icon: <Pause size={14} />, variant: "outline" },
    { value: "concluida", label: "Concluir", icon: <CheckCircle2 size={14} /> },
  ],
  pausada: [
    { value: "ativa", label: "Retomar", icon: <Play size={14} /> },
    { value: "cancelada", label: "Cancelar", icon: <XCircle size={14} />, variant: "danger" },
  ],
  concluida: [],
  cancelada: [],
};

function fmtInt(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(n);
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getCampaignDetail(session.tenantId, id);
  if (!data) notFound();
  const { campaign: c, actions, kpis } = data;
  const status = c.status as CampaignStatus;
  const budget = Number(c.budget);
  const spent = Number(c.spent);
  const revenue = Number(c.revenue);
  const usage = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const roi = roiPct(spent, revenue);
  const nextActions = STATUS_ACTIONS[status];

  return (
    <div>
      <Link
        href="/marketing/campanhas"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Campanhas
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{c.name}</h1>
          <p className="text-sm text-neutral-500">
            {c.campaignNumber} · {campaignTypeLabel[c.campaignType]}
            {c.brandName ? ` · ${c.brandName}` : ""}
            {c.planName ? ` · Plano: ${c.planName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={campaignStatusTone[status]}>{campaignStatusLabel[status]}</Badge>
          <Link href={`/marketing/campanhas/${c.id}/editar`}>
            <Button size="sm" variant="outline">
              <Pencil size={14} /> Editar
            </Button>
          </Link>
        </div>
      </div>

      {nextActions.length > 0 && (
        <Card className="mb-4 flex flex-wrap items-center gap-2 p-4">
          <span className="mr-2 text-sm text-neutral-500">Fluxo:</span>
          {nextActions.map((a) => (
            <form key={a.value} action={setCampaignStatusAction.bind(null, c.id)}>
              <input type="hidden" name="status" value={a.value} />
              {a.variant === "danger" ? (
                <ConfirmButton message={`Confirmar "${a.label}" da campanha?`} size="sm" variant="danger">
                  {a.icon} {a.label}
                </ConfirmButton>
              ) : (
                <Button type="submit" size="sm" variant={a.variant ?? "primary"}>
                  {a.icon} {a.label}
                </Button>
              )}
            </form>
          ))}
        </Card>
      )}

      {/* Indicadores financeiros */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Orçamento" value={fmtBRL(budget)} />
        <Metric label="Realizado" value={fmtBRL(spent)} hint={`${usage}% do orçamento`} />
        <Metric label="Receita atribuída" value={fmtBRL(revenue)} />
        <Metric
          label="ROI"
          value={roi != null ? fmtPct(roi) : "—"}
          tone={roi != null ? (roi >= 0 ? "good" : "danger") : undefined}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Dados da campanha</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Field label="Licenciado" value={c.licenseeName} />
            <Field label="Canal" value={c.channel} />
            <Field label="Território" value={c.territorio} />
            <Field
              label="Período"
              value={c.startDate ? `${fmtDate(c.startDate)} → ${fmtDate(c.endDate)}` : "—"}
            />
            <Field label="Verba" value={c.coop ? "Cooperada" : "Própria"} />
            <Field label="Público" value={c.publico} />
            <Field label="Objetivo" value={c.goal} className="sm:col-span-3" />
          </dl>
          {c.notes && (
            <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-500 dark:border-neutral-800">
              {c.notes}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <div className="text-xs font-medium text-neutral-500">Execução do orçamento</div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{fmtBRL(spent)}</div>
          <div className="mt-0.5 text-xs text-neutral-400">de {fmtBRL(budget)}</div>
          <ProgressBar pct={usage} className="mt-3" />
          <div className="mt-2 text-xs text-neutral-500">{usage}% executado</div>
          <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">Receita</span>
              <span className="font-semibold tabular-nums">{fmtBRL(revenue)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-neutral-500">ROI</span>
              {roi != null ? (
                <Badge tone={roi >= 0 ? "good" : "danger"}>{fmtPct(roi)}</Badge>
              ) : (
                <span className="text-neutral-400">—</span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* KPIs */}
      <Card className="mt-4 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Target size={15} className="text-neutral-400" /> KPIs & metas
        </h2>
        <p className="mb-3 text-xs text-neutral-500">Defina metas e acompanhe o realizado.</p>
        <div className="mb-4">
          <KpiForm campaignId={c.id} />
        </div>
        {kpis.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum KPI cadastrado.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((k) => {
              const target = k.target != null ? Number(k.target) : null;
              const realized = Number(k.realized);
              const pct = target && target > 0 ? Math.round((realized / target) * 100) : null;
              return (
                <div key={k.id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                  <div className="text-xs font-medium text-neutral-500">{k.name}</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-bold tabular-nums">
                      {realized.toLocaleString("pt-BR")}
                    </span>
                    {k.unit && <span className="text-xs text-neutral-400">{k.unit}</span>}
                    {target != null && (
                      <span className="ml-auto text-[11px] text-neutral-400">
                        meta {target.toLocaleString("pt-BR")}
                      </span>
                    )}
                  </div>
                  {pct != null && <ProgressBar pct={pct} className="mt-2" />}
                  {pct != null && <div className="mt-1 text-[11px] text-neutral-400">{pct}% da meta</div>}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Ações */}
      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Ações & táticas</h2>
            <p className="text-xs text-neutral-500">
              Cada ação soma ao realizado e à receita da campanha.
            </p>
          </div>
          <Link href={`/marketing/acoes/nova?campaignId=${c.id}`}>
            <Button size="sm">
              <Plus size={14} /> Nova ação
            </Button>
          </Link>
        </div>
        {actions.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma ação registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th className="px-3 py-2 font-medium">Ação</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 text-right font-medium">Gasto</th>
                  <th className="px-3 py-2 text-right font-medium">Receita</th>
                  <th className="px-3 py-2 text-right font-medium">ROI</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a) => {
                  const aSpent = Number(a.spent);
                  const aRev = Number(a.revenue);
                  const aRoi = roiPct(aSpent, aRev);
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-neutral-100 last:border-0 dark:border-neutral-800"
                    >
                      <td className="px-3 py-2 font-medium">
                        <Link href={`/marketing/acoes/${a.id}`} className="hover:text-blue-600">
                          {a.name}
                          {a.evidenceUrl && (
                            <ExternalLink size={11} className="ml-1 inline text-neutral-400" />
                          )}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-neutral-500">{actionTypeLabel[a.actionType]}</td>
                      <td className="px-3 py-2">
                        <Badge tone={actionStatusTone[a.status]}>{actionStatusLabel[a.status]}</Badge>
                      </td>
                      <td className="px-3 py-2 tabular-nums text-neutral-500">{fmtDate(a.startDate)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(aSpent)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(aRev)}</td>
                      <td className="px-3 py-2 text-right">
                        {aRoi != null ? (
                          <span className={aRoi >= 0 ? "text-emerald-600" : "text-red-600"}>
                            {fmtPct(aRoi)}
                          </span>
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

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "danger";
}) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div
        className={`mt-1.5 text-xl font-bold tabular-nums ${
          tone === "good" ? "text-emerald-600" : tone === "danger" ? "text-red-600" : ""
        }`}
      >
        {value}
      </div>
      {hint && <div className="text-[11px] text-neutral-400">{hint}</div>}
    </Card>
  );
}

function Field({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="font-medium">{value ?? "—"}</dd>
    </div>
  );
}
