import Link from "next/link";
import { FileSignature, FilePlus2, Send, Ban, Download, ShieldCheck } from "lucide-react";
import { Card, Badge, Button } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import { DOCUMENT_STATUS_LABEL, type DocumentMeta } from "@/lib/data/generated-documents";
import {
  generateContractDocumentAction,
  generateRoyaltyDocumentAction,
  sendForSignatureAction,
  cancelDocumentAction,
} from "@/lib/document-actions";

const TONE: Record<string, "neutral" | "warn" | "good" | "danger"> = {
  rascunho: "neutral",
  aguardando_assinatura: "warn",
  assinado: "good",
  cancelado: "danger",
};

/** Card de documentos gerados + assinatura para as telas de contrato e royalty. */
export function GeneratedDocsCard({
  kind,
  sourceId,
  docs,
}: {
  kind: "contract" | "royalty";
  sourceId: string;
  docs: DocumentMeta[];
}) {
  const generate =
    kind === "contract"
      ? generateContractDocumentAction.bind(null, sourceId)
      : generateRoyaltyDocumentAction.bind(null, sourceId);
  const genLabel = kind === "contract" ? "Gerar contrato (PDF)" : "Gerar extrato (PDF)";

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileSignature size={16} className="text-blue-600" />
          <h2 className="text-sm font-semibold">Documentos & Assinatura</h2>
        </div>
        <form action={generate}>
          <Button size="sm" type="submit">
            <FilePlus2 size={14} /> {genLabel}
          </Button>
        </form>
      </div>

      {docs.length === 0 ? (
        <p className="text-xs text-neutral-500">
          Nenhum documento gerado ainda. Gere o PDF branded e envie para assinatura eletrônica no Portal do
          Licenciado.
        </p>
      ) : (
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {docs.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{d.number}</span>
                  <Badge tone={TONE[d.status]}>{DOCUMENT_STATUS_LABEL[d.status]}</Badge>
                </div>
                <div className="mt-0.5 text-xs text-neutral-500">
                  {d.title}
                  {d.status === "assinado" && d.signerName
                    ? ` · assinado por ${d.signerName} em ${fmtDate(d.signedAt)}`
                    : ""}
                  {` · cód. ${d.verificationCode}`}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/documentos/${d.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:border-blue-400 hover:text-blue-600 dark:border-neutral-700 dark:text-neutral-300"
                >
                  <Download size={13} /> Baixar
                </a>
                {d.status === "rascunho" && (
                  <form action={sendForSignatureAction.bind(null, d.id)}>
                    <Button size="sm" variant="outline" type="submit">
                      <Send size={13} /> Enviar p/ assinatura
                    </Button>
                  </form>
                )}
                {(d.status === "rascunho" || d.status === "aguardando_assinatura") && (
                  <form action={cancelDocumentAction.bind(null, d.id)}>
                    <Button size="sm" variant="ghost" type="submit">
                      <Ban size={13} /> Cancelar
                    </Button>
                  </form>
                )}
                {d.status === "assinado" && (
                  <Link
                    href={`/verificar/${d.verificationCode}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400"
                  >
                    <ShieldCheck size={13} /> Verificar
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
