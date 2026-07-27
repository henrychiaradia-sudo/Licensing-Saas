import { requireSupplierSession } from "@/lib/auth";
import { listSupplierNcs } from "@/lib/data/supplier-portal";
import { NcResponseForm } from "../nc-response-form";
import { Card, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import type { NcSeverity, NcStatus } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";
const sevTone: Record<NcSeverity, Tone> = { baixa: "neutral", media: "info", alta: "warn", critica: "danger" };
const sevLabel: Record<NcSeverity, string> = { baixa: "Baixa", media: "Média", alta: "Alta", critica: "Crítica" };
const stTone: Record<NcStatus, Tone> = { aberta: "danger", em_tratamento: "warn", resolvida: "good", cancelada: "neutral" };
const stLabel: Record<NcStatus, string> = {
  aberta: "Aberta",
  em_tratamento: "Em tratamento",
  resolvida: "Resolvida",
  cancelada: "Cancelada",
};

export default async function SupplierQualityPage() {
  const session = await requireSupplierSession();
  const ncs = await listSupplierNcs(session.tenantId, session.supplierId);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Qualidade</h1>
        <p className="text-sm text-neutral-500">
          Não-conformidades apontadas nas inspeções — registre sua ação corretiva
        </p>
      </div>

      {ncs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-neutral-400">
          Nenhuma não-conformidade registrada. 👏
        </Card>
      ) : (
        <div className="grid gap-3">
          {ncs.map((nc) => {
            const sev = nc.severity as NcSeverity;
            const st = nc.status as NcStatus;
            const canRespond = st === "aberta" || st === "em_tratamento";
            return (
              <Card key={nc.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{nc.ncNumber}</span>
                    <Badge tone={sevTone[sev]}>{sevLabel[sev]}</Badge>
                    <Badge tone={stTone[st]}>{stLabel[st]}</Badge>
                  </div>
                  <span className="text-xs text-neutral-400">
                    {nc.inspectionNumber ? `Inspeção ${nc.inspectionNumber}` : ""} · aberta {fmtDate(nc.openedAt)}
                  </span>
                </div>
                <p className="mt-2 text-sm">{nc.description}</p>
                {nc.disposition && (
                  <p className="mt-1 text-xs text-neutral-500">
                    <span className="text-neutral-400">Disposição:</span> {nc.disposition}
                  </p>
                )}

                <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                  <div className="mb-1 text-xs font-medium text-neutral-500">Ação corretiva (fornecedor)</div>
                  {canRespond ? (
                    <NcResponseForm ncId={nc.id} current={nc.correctiveAction} />
                  ) : (
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      {nc.correctiveAction ?? "—"}
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const dynamic = "force-dynamic";
