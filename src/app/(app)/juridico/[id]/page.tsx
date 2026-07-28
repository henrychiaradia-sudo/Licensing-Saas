import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Pause, CheckCircle2, Archive, RotateCcw } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getLegalCaseDetail } from "@/lib/data/legal";
import { setLegalCaseStatusAction } from "../actions";
import { EventForm } from "../event-form";
import {
  legalStatusTone,
  legalStatusLabel,
  legalTypeLabel,
  legalPriorityTone,
  legalPriorityLabel,
} from "../page";
import { Card, Badge, Button } from "@/components/ui";
import { fmtBRL, fmtDate } from "@/lib/utils";
import type { LegalCaseStatus, LegalCasePriority, LegalCaseType, LegalEventType } from "@/lib/db/schema";

const eventTypeLabel: Record<LegalEventType, string> = {
  andamento: "Andamento",
  audiencia: "Audiência",
  peticao: "Petição",
  decisao: "Decisão",
  acordo: "Acordo",
  prazo: "Prazo",
};
const eventTypeTone: Record<LegalEventType, "good" | "info" | "neutral" | "warn" | "danger"> = {
  andamento: "neutral",
  audiencia: "info",
  peticao: "info",
  decisao: "warn",
  acordo: "good",
  prazo: "danger",
};

const STATUS_ACTIONS: Record<
  LegalCaseStatus,
  { value: LegalCaseStatus; label: string; icon: React.ReactNode; variant?: "primary" | "outline" | "danger" }[]
> = {
  aberto: [{ value: "em_andamento", label: "Iniciar andamento", icon: <Play size={14} /> }],
  em_andamento: [
    { value: "suspenso", label: "Suspender", icon: <Pause size={14} />, variant: "outline" },
    { value: "encerrado", label: "Encerrar", icon: <CheckCircle2 size={14} /> },
  ],
  suspenso: [
    { value: "em_andamento", label: "Retomar", icon: <Play size={14} /> },
    { value: "arquivado", label: "Arquivar", icon: <Archive size={14} />, variant: "outline" },
  ],
  encerrado: [{ value: "arquivado", label: "Arquivar", icon: <Archive size={14} />, variant: "outline" }],
  arquivado: [{ value: "aberto", label: "Reabrir", icon: <RotateCcw size={14} />, variant: "outline" }],
};

export default async function LegalCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getLegalCaseDetail(session.tenantId, id);
  if (!data) notFound();
  const { legalCase: c, events } = data;
  const status = c.status as LegalCaseStatus;
  const priority = c.priority as LegalCasePriority;
  const caseType = c.caseType as LegalCaseType;
  const nextActions = STATUS_ACTIONS[status];

  return (
    <div>
      <Link
        href="/juridico"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Jurídico
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{c.title}</h1>
          <p className="text-sm text-neutral-500">
            {c.caseNumber} · {legalTypeLabel[caseType]}
            {c.brandName ? ` · ${c.brandName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={legalPriorityTone[priority]}>{legalPriorityLabel[priority]}</Badge>
          <Badge tone={legalStatusTone[status]}>{legalStatusLabel[status]}</Badge>
        </div>
      </div>

      {nextActions.length > 0 && (
        <Card className="mb-4 flex flex-wrap items-center gap-2 p-4">
          <span className="mr-2 text-sm text-neutral-500">Mudar status:</span>
          {nextActions.map((a) => (
            <form key={a.value} action={setLegalCaseStatusAction.bind(null, c.id)}>
              <input type="hidden" name="status" value={a.value} />
              <Button type="submit" size="sm" variant={a.variant ?? "primary"}>
                {a.icon} {a.label}
              </Button>
            </form>
          ))}
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Dados do caso</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Field label="Contraparte" value={c.counterparty} />
            <Field label="Licenciado" value={c.licenseeName} />
            <Field label="Responsável" value={c.responsible} />
            <Field label="Foro / instância" value={c.forum} />
            <Field label="Abertura" value={c.openedAt ? fmtDate(c.openedAt) : "—"} />
            <Field label="Próximo prazo" value={c.dueDate ? fmtDate(c.dueDate) : "—"} />
            {c.closedAt && <Field label="Encerramento" value={fmtDate(c.closedAt)} />}
          </dl>
          {c.description && (
            <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
              {c.description}
            </p>
          )}
          {c.notes && (
            <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-500 dark:bg-neutral-800/50">
              <span className="font-medium">Observações internas: </span>
              {c.notes}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <div className="text-xs font-medium text-neutral-500">Valor em risco</div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{fmtBRL(Number(c.amountAtRisk))}</div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Tipo</span>
              <span className="font-medium">{legalTypeLabel[caseType]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Prioridade</span>
              <Badge tone={legalPriorityTone[priority]}>{legalPriorityLabel[priority]}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Andamentos</span>
              <span className="font-medium tabular-nums">{events.length}</span>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="mb-1 text-sm font-semibold">Linha do tempo do caso</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Registre andamentos, audiências, petições, decisões e prazos.
        </p>
        <div className="mb-5">
          <EventForm caseId={c.id} />
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum andamento registrado.</p>
        ) : (
          <ol className="relative ml-2 border-l border-neutral-200 dark:border-neutral-800">
            {events.map((e) => (
              <li key={e.id} className="mb-5 ml-5 last:mb-0">
                <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500 dark:border-neutral-900" />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={eventTypeTone[e.eventType as LegalEventType]}>
                    {eventTypeLabel[e.eventType as LegalEventType]}
                  </Badge>
                  <span className="text-xs tabular-nums text-neutral-400">
                    {e.occurredAt ? fmtDate(e.occurredAt) : fmtDate(e.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">{e.description}</p>
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
