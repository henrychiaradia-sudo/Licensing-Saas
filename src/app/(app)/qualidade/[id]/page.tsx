import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getInspectionDetail } from "@/lib/data/quality";
import { setInspectionResultAction, setNcStatusAction } from "../actions";
import { NcForm } from "../nc-form";
import { resultTone, resultLabel, typeLabel } from "../page";
import { Card, Badge, Button } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import type { NcSeverity, NcStatus, QualityResult } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

const severityTone: Record<NcSeverity, Tone> = {
  baixa: "neutral",
  media: "info",
  alta: "warn",
  critica: "danger",
};
const severityLabel: Record<NcSeverity, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};
const ncStatusTone: Record<NcStatus, Tone> = {
  aberta: "danger",
  em_tratamento: "warn",
  resolvida: "good",
  cancelada: "neutral",
};
const ncStatusLabel: Record<NcStatus, string> = {
  aberta: "Aberta",
  em_tratamento: "Em tratamento",
  resolvida: "Resolvida",
  cancelada: "Cancelada",
};
const RESULT_OPTIONS: QualityResult[] = ["pendente", "aprovado", "aprovado_condicional", "reprovado"];
const NC_NEXT: Record<NcStatus, { value: NcStatus; label: string }[]> = {
  aberta: [
    { value: "em_tratamento", label: "Iniciar tratamento" },
    { value: "resolvida", label: "Marcar resolvida" },
    { value: "cancelada", label: "Cancelar" },
  ],
  em_tratamento: [
    { value: "resolvida", label: "Marcar resolvida" },
    { value: "cancelada", label: "Cancelar" },
  ],
  resolvida: [],
  cancelada: [],
};

export default async function InspectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getInspectionDetail(session.tenantId, id);
  if (!data) notFound();
  const { inspection: insp, ncs } = data;
  const defectRate =
    insp.sampleSize > 0 ? ((insp.defectsFound / insp.sampleSize) * 100).toFixed(1) : "—";

  return (
    <div>
      <Link
        href="/qualidade"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Qualidade
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{insp.inspectionNumber}</h1>
          <p className="text-sm text-neutral-500">{insp.title}</p>
        </div>
        <Badge tone={resultTone[insp.result]}>{resultLabel[insp.result]}</Badge>
      </div>

      <Card className="p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Field label="Tipo" value={typeLabel[insp.inspectionType]} />
          <Field label="Fornecedor" value={insp.supplierName} />
          <Field label="Data da inspeção" value={fmtDate(insp.inspectedAt)} />
          <Field label="Amostra" value={String(insp.sampleSize)} />
          <Field label="Defeitos" value={String(insp.defectsFound)} />
          <Field label="Taxa de defeitos" value={defectRate === "—" ? "—" : `${defectRate}%`} />
        </dl>
        {insp.notes && (
          <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-500 dark:border-neutral-800">
            {insp.notes}
          </p>
        )}
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="text-sm font-semibold">Atualizar resultado</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Defina o parecer final da inspeção. Fica registrado na trilha de auditoria.
        </p>
        <form action={setInspectionResultAction.bind(null, insp.id)} className="flex flex-wrap items-center gap-2">
          <select
            name="result"
            defaultValue={insp.result}
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            {RESULT_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {resultLabel[r]}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">
            Salvar resultado
          </Button>
        </form>
      </Card>

      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle size={16} className="text-amber-500" /> Não-conformidades
          </h2>
          <Badge tone="neutral">{ncs.length}</Badge>
        </div>

        {ncs.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma não-conformidade registrada nesta inspeção.</p>
        ) : (
          <div className="grid gap-3">
            {ncs.map((nc) => {
              const sev = nc.severity as NcSeverity;
              const st = nc.status as NcStatus;
              return (
                <div
                  key={nc.id}
                  className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{nc.ncNumber}</span>
                      <Badge tone={severityTone[sev]}>{severityLabel[sev]}</Badge>
                      <Badge tone={ncStatusTone[st]}>{ncStatusLabel[st]}</Badge>
                    </div>
                    <span className="text-xs text-neutral-400">
                      Aberta {fmtDate(nc.openedAt)}
                      {nc.resolvedAt ? ` · resolvida ${fmtDate(nc.resolvedAt)}` : ""}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{nc.description}</p>
                  {(nc.disposition || nc.correctiveAction) && (
                    <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs text-neutral-500 sm:grid-cols-2">
                      {nc.disposition && (
                        <div>
                          <dt className="text-neutral-400">Disposição</dt>
                          <dd>{nc.disposition}</dd>
                        </div>
                      )}
                      {nc.correctiveAction && (
                        <div>
                          <dt className="text-neutral-400">Ação corretiva</dt>
                          <dd>{nc.correctiveAction}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  {NC_NEXT[st].length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                      {NC_NEXT[st].map((n) => (
                        <form key={n.value} action={setNcStatusAction.bind(null, nc.id)}>
                          <input type="hidden" name="inspectionId" value={insp.id} />
                          <input type="hidden" name="status" value={n.value} />
                          <Button
                            type="submit"
                            size="sm"
                            variant={n.value === "cancelada" ? "outline" : "primary"}
                          >
                            {n.label}
                          </Button>
                        </form>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-5 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <h3 className="mb-3 text-sm font-semibold">Registrar não-conformidade</h3>
          <NcForm inspectionId={insp.id} />
        </div>
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
