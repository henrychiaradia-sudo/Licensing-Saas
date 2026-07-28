import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Play, CheckCircle2, XCircle, ThumbsUp, Pencil, Plus } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getPlanDetail } from "@/lib/data/marketing-plans";
import { roiPct } from "@/lib/data/marketing";
import { setPlanStatusAction } from "../../actions";
import { Card, Badge, Button } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { ProgressBar } from "@/components/charts";
import { fmtBRL, fmtDate, fmtPct } from "@/lib/utils";
import {
  planStatusTone,
  planStatusLabel,
  campaignStatusTone,
  campaignStatusLabel,
  actionTypeLabel,
} from "../../labels";
import type { MarketingPlanStatus } from "@/lib/db/schema";

const STATUS_ACTIONS: Record<
  MarketingPlanStatus,
  { value: MarketingPlanStatus; label: string; icon: React.ReactNode; variant?: "primary" | "outline" | "danger" }[]
> = {
  rascunho: [{ value: "aprovado", label: "Aprovar", icon: <ThumbsUp size={14} /> }],
  aprovado: [
    { value: "em_execucao", label: "Iniciar execução", icon: <Play size={14} /> },
    { value: "cancelado", label: "Cancelar", icon: <XCircle size={14} />, variant: "danger" },
  ],
  em_execucao: [
    { value: "concluido", label: "Concluir", icon: <CheckCircle2 size={14} /> },
    { value: "cancelado", label: "Cancelar", icon: <XCircle size={14} />, variant: "danger" },
  ],
  concluido: [],
  cancelado: [],
};

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getPlanDetail(session.tenantId, id);
  if (!data) notFound();
  const { plan: p, campaigns, looseActions, rollup } = data;
  const status = p.status as MarketingPlanStatus;
  const nextActions = STATUS_ACTIONS[status];
  const roi = roiPct(rollup.realized, rollup.revenue);

  return (
    <div>
      <Link
        href="/marketing/planos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Planos
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{p.name}</h1>
          <p className="text-sm text-neutral-500">
            {p.planNumber}
            {p.year ? ` · ${p.year}` : ""}
            {p.brandName ? ` · ${p.brandName}` : ""}
            {p.licenseeName ? ` · ${p.licenseeName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={planStatusTone[status]}>{planStatusLabel[status]}</Badge>
          <Link href={`/marketing/planos/${p.id}/editar`}>
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
            <form key={a.value} action={setPlanStatusAction.bind(null, p.id)}>
              <input type="hidden" name="status" value={a.value} />
              {a.variant === "danger" ? (
                <ConfirmButton message={`Confirmar "${a.label}" do plano?`} size="sm" variant="danger">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Verba planejada" value={fmtBRL(rollup.budget)} />
        <Metric label="Realizado" value={fmtBRL(rollup.realized)} hint={`${rollup.usage}%`} />
        <Metric label="Receita" value={fmtBRL(rollup.revenue)} />
        <Metric
          label="ROI"
          value={roi != null ? fmtPct(roi) : "—"}
          tone={roi != null ? (roi >= 0 ? "good" : "danger") : undefined}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Estratégia</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <Field label="Território" value={p.territorio} />
            <Field
              label="Período"
              value={p.startDate ? `${fmtDate(p.startDate)} → ${fmtDate(p.endDate)}` : "—"}
            />
            <Field label="Público" value={p.publico} className="sm:col-span-2" />
            <Field label="Objetivo" value={p.objetivo} className="sm:col-span-2" />
          </dl>
          {p.notes && (
            <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-500 dark:border-neutral-800">
              {p.notes}
            </p>
          )}
        </Card>
        <Card className="p-5">
          <div className="text-xs font-medium text-neutral-500">Execução da verba</div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{fmtBRL(rollup.realized)}</div>
          <div className="mt-0.5 text-xs text-neutral-400">de {fmtBRL(rollup.budget)}</div>
          <ProgressBar pct={rollup.usage} className="mt-3" />
          <div className="mt-2 text-xs text-neutral-500">{rollup.usage}% executado</div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Campanhas do plano</h2>
          <Link href="/marketing/campanhas/nova">
            <Button size="sm" variant="outline">
              <Plus size={14} /> Campanha
            </Button>
          </Link>
        </div>
        {campaigns.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma campanha vinculada a este plano.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th className="px-3 py-2 font-medium">Campanha</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Orçado</th>
                  <th className="px-3 py-2 text-right font-medium">Realizado</th>
                  <th className="px-3 py-2 text-right font-medium">Receita</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="px-3 py-2 font-medium">
                      <Link href={`/marketing/campanhas/${c.id}`} className="hover:text-blue-600">
                        {c.campaignNumber} · {c.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2">
                      <Badge tone={campaignStatusTone[c.status]}>{campaignStatusLabel[c.status]}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(Number(c.budget))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(Number(c.spent))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(Number(c.revenue))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {looseActions.length > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="mb-3 text-sm font-semibold">Ações avulsas do plano</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th className="px-3 py-2 font-medium">Ação</th>
                  <th className="px-3 py-2 font-medium">Tática</th>
                  <th className="px-3 py-2 text-right font-medium">Gasto</th>
                  <th className="px-3 py-2 text-right font-medium">Receita</th>
                </tr>
              </thead>
              <tbody>
                {looseActions.map((a) => (
                  <tr key={a.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="px-3 py-2 font-medium">
                      <Link href={`/marketing/acoes/${a.id}`} className="hover:text-blue-600">
                        {a.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-neutral-500">{actionTypeLabel[a.actionType]}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(Number(a.spent))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(Number(a.revenue))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
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
