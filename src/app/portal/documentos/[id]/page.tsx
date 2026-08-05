import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, ShieldCheck, FileText } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import {
  getLicenseeDocument,
  DOCUMENT_STATUS_LABEL,
  DOCUMENT_TYPE_LABEL,
} from "@/lib/data/generated-documents";
import { Card, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import type { DocumentStatus } from "@/lib/db/schema";
import { SignForm } from "../sign-form";

const TONE: Record<DocumentStatus, "neutral" | "warn" | "good" | "danger"> = {
  rascunho: "neutral",
  aguardando_assinatura: "warn",
  assinado: "good",
  cancelado: "danger",
};

export default async function PortalDocumentoDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireLicenseeSession();
  const doc = await getLicenseeDocument(session.tenantId, session.licenseeId, id);
  if (!doc) notFound();

  return (
    <div>
      <Link
        href="/portal/documentos"
        className="mb-2 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-emerald-600"
      >
        <ArrowLeft size={14} /> Documentos
      </Link>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{doc.title}</h1>
          <p className="text-sm text-neutral-500">
            {DOCUMENT_TYPE_LABEL[doc.docType]} · {doc.number}
          </p>
        </div>
        <Badge tone={TONE[doc.status]}>{DOCUMENT_STATUS_LABEL[doc.status]}</Badge>
      </div>

      <Card className="mb-4 p-5">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-neutral-400" />
          <h2 className="text-sm font-semibold">Documento</h2>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Abra o PDF para leitura completa antes de assinar. O documento é branded e traz o código de
          verificação no rodapé.
        </p>
        <a
          href={`/api/documentos/${doc.id}`}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:border-emerald-400 hover:text-emerald-700 dark:border-neutral-700 dark:text-neutral-200"
        >
          <Download size={14} /> Abrir / baixar PDF
        </a>
      </Card>

      {doc.status === "aguardando_assinatura" && (
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold">Assinatura eletrônica</h2>
          <p className="mb-4 text-xs text-neutral-500">
            Confirme seus dados e o aceite para assinar. Uma via com Certificado de Assinatura Eletrônica
            (autoria, data/hora, IP e SHA-256) será anexada automaticamente.
          </p>
          <SignForm id={doc.id} defaultEmail={session.email} />
        </Card>
      )}

      {doc.status === "assinado" && (
        <Card className="border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
            <ShieldCheck size={18} />
            <p className="text-sm font-semibold">
              Assinado por {doc.signerName} em {fmtDate(doc.signedAt)}.
            </p>
          </div>
          <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/70">
            Código de verificação: <span className="font-semibold">{doc.verificationCode}</span>
          </p>
          <Link
            href={`/verificar/${doc.verificationCode}`}
            target="_blank"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
          >
            <ShieldCheck size={14} /> Verificar autenticidade
          </Link>
        </Card>
      )}

      {doc.status === "cancelado" && (
        <Card className="p-5 text-sm text-neutral-500">Este documento foi cancelado pelo emissor.</Card>
      )}
    </div>
  );
}
