import Link from "next/link";
import { FileSignature, PenLine, ShieldCheck, ArrowRight } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { listLicenseeDocuments, DOCUMENT_STATUS_LABEL } from "@/lib/data/generated-documents";
import { Card, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import type { DocumentStatus } from "@/lib/db/schema";

const TONE: Record<DocumentStatus, "neutral" | "warn" | "good" | "danger"> = {
  rascunho: "neutral",
  aguardando_assinatura: "warn",
  assinado: "good",
  cancelado: "danger",
};

export default async function PortalDocumentos() {
  const session = await requireLicenseeSession();
  const docs = await listLicenseeDocuments(session.tenantId, session.licenseeId);
  const pendentes = docs.filter((d) => d.status === "aguardando_assinatura").length;

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <FileSignature size={20} className="text-emerald-600" />
        <div>
          <h1 className="text-xl font-bold">Documentos</h1>
          <p className="text-sm text-neutral-500">
            Contratos e extratos para leitura e assinatura eletrônica · {docs.length} documento(s)
          </p>
        </div>
      </div>

      {pendentes > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <PenLine size={16} />
          Você tem {pendentes} documento(s) aguardando sua assinatura.
        </div>
      )}

      {docs.length === 0 ? (
        <Card className="p-10 text-center text-sm text-neutral-400">
          Nenhum documento disponível no momento.
        </Card>
      ) : (
        <div className="grid gap-3">
          {docs.map((d) => (
            <Link key={d.id} href={`/portal/documentos/${d.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4 transition-shadow hover:shadow-md">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{d.title}</span>
                    <Badge tone={TONE[d.status]}>{DOCUMENT_STATUS_LABEL[d.status]}</Badge>
                  </div>
                  <div className="mt-0.5 text-xs text-neutral-500">
                    {d.number}
                    {d.status === "assinado" && d.signedAt
                      ? ` · assinado em ${fmtDate(d.signedAt)}`
                      : d.status === "aguardando_assinatura"
                        ? " · aguardando sua assinatura"
                        : ""}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {d.status === "aguardando_assinatura" ? (
                    <>
                      <PenLine size={14} /> Revisar e assinar
                    </>
                  ) : d.status === "assinado" ? (
                    <>
                      <ShieldCheck size={14} /> Ver documento
                    </>
                  ) : (
                    <>
                      Ver <ArrowRight size={14} />
                    </>
                  )}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
