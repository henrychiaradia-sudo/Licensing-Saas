import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Megaphone } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getActionDetail, listCampaigns, roiPct } from "@/lib/data/marketing";
import { listAgencyOptions, listInfluencerOptions } from "@/lib/data/marketing-registry";
import { ActionForm } from "../action-form";
import { updateActionAction } from "../../actions";
import { Card, Badge } from "@/components/ui";
import { fmtBRL, fmtPct } from "@/lib/utils";
import { actionTypeLabel, actionStatusTone, actionStatusLabel } from "../../labels";

function fmtInt(n: number | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR").format(n);
}

export default async function ActionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const a = await getActionDetail(session.tenantId, id);
  if (!a) notFound();
  const [campaigns, agencies, influencers] = await Promise.all([
    listCampaigns(session.tenantId),
    listAgencyOptions(session.tenantId),
    listInfluencerOptions(session.tenantId),
  ]);

  const spent = Number(a.spent);
  const revenue = Number(a.revenue);
  const roi = roiPct(spent, revenue);

  return (
    <div>
      <Link
        href="/marketing/acoes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Ações
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{a.name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
            {actionTypeLabel[a.actionType]}
            <Badge tone={actionStatusTone[a.status]}>{actionStatusLabel[a.status]}</Badge>
            {a.campaignName && (
              <Link
                href={`/marketing/campanhas/${a.campaignId}`}
                className="inline-flex items-center gap-1 hover:text-blue-600"
              >
                <Megaphone size={13} /> {a.campaignName}
              </Link>
            )}
          </p>
        </div>
        {a.evidenceUrl && (
          <a
            href={a.evidenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
          >
            <ExternalLink size={14} /> Evidência
          </a>
        )}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Realizado" value={fmtBRL(spent)} />
        <Metric label="Receita" value={fmtBRL(revenue)} />
        <Metric
          label="ROI"
          value={roi != null ? fmtPct(roi) : "—"}
          tone={roi != null ? (roi >= 0 ? "good" : "danger") : undefined}
        />
        <Metric label="Alcance realizado" value={fmtInt(a.reachActual)} />
      </div>

      {a.resultNotes && (
        <Card className="mb-6 p-5">
          <h2 className="mb-1 text-sm font-semibold">Resultados</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">{a.resultNotes}</p>
        </Card>
      )}

      <h2 className="mb-4 text-sm font-semibold text-neutral-500">Editar ação</h2>
      <ActionForm
        action={updateActionAction.bind(null, id)}
        submitLabel="Salvar alterações"
        cancelHref={`/marketing/acoes`}
        campaigns={campaigns.map((c) => ({ id: c.id, label: `${c.campaignNumber} · ${c.name}` }))}
        agencies={agencies.map((ag) => ({ id: ag.id, label: ag.name }))}
        influencers={influencers.map((i) => ({ id: i.id, label: i.handle ? `${i.name} (${i.handle})` : i.name }))}
        defaults={{
          name: a.name,
          actionType: a.actionType,
          status: a.status,
          campaignId: a.campaignId,
          channel: a.channel,
          territorio: a.territorio,
          agencyId: a.agencyId,
          influencerId: a.influencerId,
          budget: a.budget,
          spent: a.spent,
          revenue: a.revenue,
          reachTarget: a.reachTarget,
          reachActual: a.reachActual,
          coop: a.coop,
          location: a.location,
          startDate: a.startDate,
          endDate: a.endDate,
          evidenceUrl: a.evidenceUrl,
          resultNotes: a.resultNotes,
          notes: a.notes,
        }}
      />
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
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
    </Card>
  );
}
