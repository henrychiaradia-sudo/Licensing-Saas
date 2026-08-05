import Link from "next/link";
import { FileSignature, Download, ShieldCheck } from "lucide-react";
import { requireSession } from "@/lib/auth";
import {
  listDocuments,
  DOCUMENT_STATUS_LABEL,
  DOCUMENT_TYPE_LABEL,
} from "@/lib/data/generated-documents";
import { Card, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import type { DocumentStatus } from "@/lib/db/schema";

const TONE: Record<DocumentStatus, "neutral" | "warn" | "good" | "danger"> = {
  rascunho: "neutral",
  aguardando_assinatura: "warn",
  assinado: "good",
  cancelado: "danger",
};

const FILTERS: { key: string; label: string; status?: DocumentStatus }[] = [
  { key: "todos", label: "Todos" },
  { key: "aguardando_assinatura", label: "Aguardando", status: "aguardando_assinatura" },
  { key: "assinado", label: "Assinados", status: "assinado" },
  { key: "rascunho", label: "Rascunhos", status: "rascunho" },
  { key: "cancelado", label: "Cancelados", status: "cancelado" },
];

export default async function DocumentosGeradosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireSession();
  const { status } = await searchParams;
  const active = FILTERS.find((f) => f.key === status) ?? FILTERS[0];
  const docs = await listDocuments(session.tenantId, { status: active.status });

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <FileSignature size={20} className="text-blue-600" />
        <div>
          <h1 className="text-xl font-bold">Documentos & Assinatura</h1>
          <p className="text-sm text-neutral-500">
            Contratos e extratos gerados em PDF branded, com trilha de assinatura eletrônica · {docs.length}{" "}
            documento(s)
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "todos" ? "/documentos-gerados" : `/documentos-gerados?status=${f.key}`}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              active.key === f.key
                ? "bg-blue-600 text-white"
                : "border border-neutral-200 text-neutral-600 hover:border-blue-400 dark:border-neutral-700 dark:text-neutral-300"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3 font-semibold">Número</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Licenciado</th>
                <th className="px-4 py-3 font-semibold">Situação</th>
                <th className="px-4 py-3 font-semibold">Signatário</th>
                <th className="px-4 py-3 font-semibold">Emitido</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {docs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-400">
                    Nenhum documento nesta visão. Gere PDFs a partir de um contrato ou de um extrato de
                    royalties.
                  </td>
                </tr>
              )}
              {docs.map((d) => (
                <tr
                  key={d.id}
                  className="border-t border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40"
                >
                  <td className="px-4 py-3">
                    <span className="font-medium">{d.number}</span>
                    <div className="text-xs text-neutral-400">cód. {d.verificationCode}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{DOCUMENT_TYPE_LABEL[d.docType]}</td>
                  <td className="px-4 py-3 text-neutral-500">{d.licenseeName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={TONE[d.status]}>{DOCUMENT_STATUS_LABEL[d.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {d.signerName ? (
                      <>
                        {d.signerName}
                        <div className="text-xs text-neutral-400">{fmtDate(d.signedAt)}</div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-neutral-500">{fmtDate(d.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`/api/documentos/${d.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:border-blue-400 hover:text-blue-600 dark:border-neutral-700 dark:text-neutral-300"
                      >
                        <Download size={13} /> Baixar
                      </a>
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
