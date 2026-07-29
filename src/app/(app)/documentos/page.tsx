import Link from "next/link";
import { FileText, AlertTriangle, Clock, FileCheck } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listDocumentAlerts } from "@/lib/data/documents";
import { Card, Badge, StatCard } from "@/components/ui";
import { ExportCsvButton } from "@/components/export-csv-button";
import { fmtDate } from "@/lib/utils";
import { validityTone } from "../fornecedores/supplier-meta";
import { DOC_TYPE_LABEL, DOC_STATUS_LABEL, DOC_STATUS_TONE } from "../fornecedores/doc-meta";

function daysTo(v: string | null): number | null {
  if (!v) return null;
  const d = new Date(v.length === 10 ? v + "T00:00:00" : v);
  const n = Math.ceil((d.getTime() - Date.now()) / 86400000);
  return Number.isNaN(n) ? null : n;
}

export default async function DocumentosPage() {
  const session = await requireSession();
  const docs = await listDocumentAlerts(session.tenantId);

  let vencidos = 0;
  let aVencer = 0;
  let pendentes = 0;
  for (const d of docs) {
    const dd = daysTo(d.validUntil as unknown as string | null);
    if (dd != null && dd < 0) vencidos++;
    else if (dd != null && dd <= 30) aVencer++;
    if (d.status === "pendente" || d.status === "em_analise") pendentes++;
  }

  const csvColumns = [
    { key: "fornecedor", label: "Fornecedor" },
    { key: "tipo", label: "Tipo" },
    { key: "documento", label: "Documento" },
    { key: "numero", label: "Número" },
    { key: "emissor", label: "Emissor" },
    { key: "validade", label: "Validade" },
    { key: "status", label: "Status" },
    { key: "responsavel", label: "Responsável" },
  ];
  const csvRows = docs.map((d) => ({
    fornecedor: d.supplierTradeName ?? d.supplierLegalName ?? "",
    tipo: DOC_TYPE_LABEL[d.docType],
    documento: d.name ?? "",
    numero: d.number ?? "",
    emissor: d.issuer ?? "",
    validade: d.validUntil ?? "",
    status: DOC_STATUS_LABEL[d.status],
    responsavel: d.responsible ?? "",
  }));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <FileText size={20} className="text-blue-500" /> Documentos de fornecedores
          </h1>
          <p className="text-sm text-neutral-500">
            Gestão documental e alertas de validade — todos os fornecedores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="info">{docs.length} documento(s)</Badge>
          <ExportCsvButton filename="documentos-fornecedores.csv" columns={csvColumns} rows={csvRows} />
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={docs.length} icon={<FileText size={18} />} tone="blue" />
        <StatCard
          label="Vencidos"
          value={vencidos}
          icon={<AlertTriangle size={18} />}
          tone="red"
          hint="Validade expirada"
        />
        <StatCard
          label="A vencer (≤30d)"
          value={aVencer}
          icon={<Clock size={18} />}
          tone="amber"
          hint="Renovar em breve"
        />
        <StatCard
          label="Pendentes"
          value={pendentes}
          icon={<FileCheck size={18} />}
          tone="violet"
          hint="Aguardando aprovação"
        />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-3 font-medium">Fornecedor</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Documento</th>
              <th className="px-5 py-3 font-medium">Emissor</th>
              <th className="px-5 py-3 font-medium">Validade</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Responsável</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => {
              const v = validityTone(d.validUntil as unknown as string | null);
              return (
                <tr
                  key={d.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
                >
                  <td className="px-5 py-3">
                    <Link href={`/fornecedores/${d.supplierId}`} className="font-semibold text-blue-600 hover:underline">
                      {d.supplierTradeName ?? d.supplierLegalName}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{DOC_TYPE_LABEL[d.docType]}</td>
                  <td className="px-5 py-3">
                    <div>{d.name ?? "—"}</div>
                    {d.number && <div className="text-[11px] text-neutral-400">Nº {d.number}</div>}
                  </td>
                  <td className="px-5 py-3 text-neutral-500">{d.issuer ?? "—"}</td>
                  <td className="px-5 py-3">
                    <div className="tabular-nums text-neutral-500">{d.validUntil ? fmtDate(d.validUntil) : "—"}</div>
                    {d.validUntil && <Badge tone={v.tone}>{v.label}</Badge>}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={DOC_STATUS_TONE[d.status]}>{DOC_STATUS_LABEL[d.status]}</Badge>
                  </td>
                  <td className="px-5 py-3 text-neutral-500">
                    {d.responsible ?? "—"}
                    {d.approvedBy && <div className="text-[11px] text-emerald-600">✓ {d.approvedBy}</div>}
                  </td>
                </tr>
              );
            })}
            {docs.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nenhum documento cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
