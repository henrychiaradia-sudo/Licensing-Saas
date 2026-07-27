import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, UserCheck, XCircle, RotateCcw, Mail, Phone } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getOpportunityDetail } from "@/lib/data/opportunities";
import { setStageAction, convertAction } from "../actions";
import { ActivityForm } from "../activity-form";
import { stageTone, stageLabel } from "../page";
import { Card, Badge, Button } from "@/components/ui";
import { fmtBRL, fmtDate } from "@/lib/utils";
import type { OpportunityStage } from "@/lib/db/schema";

const OPEN_ORDER: OpportunityStage[] = ["prospeccao", "qualificacao", "proposta", "negociacao"];

const activityLabel: Record<string, string> = {
  nota: "Nota",
  ligacao: "Ligação",
  reuniao: "Reunião",
  email: "E-mail",
  proposta: "Proposta",
  conversao: "Conversão",
};

function fmtDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getOpportunityDetail(session.tenantId, id);
  if (!data) notFound();
  const { opportunity: o, activities, licenseeName } = data;
  const stage = o.stage as OpportunityStage;
  const isOpen = OPEN_ORDER.includes(stage);
  const idx = OPEN_ORDER.indexOf(stage);
  const nextOpen = idx >= 0 && idx < OPEN_ORDER.length - 1 ? OPEN_ORDER[idx + 1] : null;

  return (
    <div>
      <Link
        href="/pipeline"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Pipeline de Licenciamento
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{o.name}</h1>
          <p className="text-sm text-neutral-500">
            {o.opportunityNumber}
            {o.companyName ? ` · ${o.companyName}` : ""}
            {o.ownerName ? ` · resp. ${o.ownerName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">{o.probability}% prob.</Badge>
          <Badge tone={stageTone[stage]}>{stageLabel[stage]}</Badge>
        </div>
      </div>

      {isOpen && (
        <Card className="mb-4 p-5">
          <h2 className="mb-1 text-sm font-semibold">Avançar no funil</h2>
          <p className="mb-3 text-xs text-neutral-500">
            Mova a oportunidade de estágio ou converta em licenciado ao ganhar.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {nextOpen && (
              <form action={setStageAction.bind(null, o.id)}>
                <input type="hidden" name="stage" value={nextOpen} />
                <Button type="submit" size="sm">
                  <ArrowRight size={14} /> Avançar para {stageLabel[nextOpen]}
                </Button>
              </form>
            )}
            <form action={convertAction.bind(null, o.id)}>
              <Button type="submit" size="sm" variant={nextOpen ? "outline" : "primary"}>
                <UserCheck size={14} /> Converter em licenciado (Ganho)
              </Button>
            </form>
            <form action={setStageAction.bind(null, o.id)} className="flex items-center gap-2">
              <input type="hidden" name="stage" value="perdido" />
              <input
                name="lostReason"
                placeholder="Motivo da perda"
                className="h-9 w-48 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
              />
              <Button type="submit" size="sm" variant="danger">
                <XCircle size={14} /> Perdido
              </Button>
            </form>
          </div>
        </Card>
      )}

      {stage === "ganho" && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300">
            <UserCheck size={16} className="shrink-0 text-emerald-600" />
            Oportunidade ganha{licenseeName ? ` — convertida no licenciado ${licenseeName}` : "."}
          </p>
          {o.licenseeId && (
            <Link href={`/licenciados/${o.licenseeId}`}>
              <Button variant="outline" size="sm">
                Ver licenciado
              </Button>
            </Link>
          )}
        </Card>
      )}

      {stage === "perdido" && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <p className="flex items-center gap-2 text-sm text-red-800 dark:text-red-300">
            <XCircle size={16} className="shrink-0 text-red-600" />
            Oportunidade perdida{o.lostReason ? `: ${o.lostReason}` : "."}
          </p>
          <form action={setStageAction.bind(null, o.id)}>
            <input type="hidden" name="stage" value="negociacao" />
            <Button type="submit" variant="outline" size="sm">
              <RotateCcw size={14} /> Reabrir
            </Button>
          </form>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Dados da oportunidade</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Field label="Valor estimado" value={fmtBRL(Number(o.estimatedValue))} />
            <Field label="Marca-alvo" value={o.brandName} />
            <Field label="Segmento" value={o.segmentName} />
            <Field label="Origem" value={o.source} />
            <Field label="Previsão de fechamento" value={fmtDate(o.expectedCloseDate)} />
            <Field label="Contato" value={o.contactName} />
          </dl>
          {(o.contactEmail || o.contactPhone) && (
            <div className="mt-4 flex flex-wrap gap-4 border-t border-neutral-100 pt-3 text-sm dark:border-neutral-800">
              {o.contactEmail && (
                <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                  <Mail size={14} /> {o.contactEmail}
                </span>
              )}
              {o.contactPhone && (
                <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                  <Phone size={14} /> {o.contactPhone}
                </span>
              )}
            </div>
          )}
          {o.notes && (
            <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-500 dark:border-neutral-800">
              {o.notes}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <div className="text-xs font-medium text-neutral-500">Forecast ponderado</div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-emerald-600">
            {fmtBRL((Number(o.estimatedValue) * o.probability) / 100)}
          </div>
          <p className="mt-1 text-xs text-neutral-400">
            {fmtBRL(Number(o.estimatedValue))} × {o.probability}% de probabilidade
          </p>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold">Interações</h2>
        <div className="mb-4">
          <ActivityForm opportunityId={o.id} />
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma interação registrada.</p>
        ) : (
          <ol className="relative border-l border-neutral-200 dark:border-neutral-800">
            {activities.map((a) => (
              <li key={a.id} className="mb-5 ml-4 last:mb-0">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500 dark:border-neutral-900" />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{activityLabel[a.activityType] ?? a.activityType}</Badge>
                  <span className="text-xs tabular-nums text-neutral-400">{fmtDateTime(a.occurredAt)}</span>
                </div>
                <p className="mt-1 text-sm">{a.description}</p>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="font-medium">{value ?? "—"}</dd>
    </div>
  );
}
