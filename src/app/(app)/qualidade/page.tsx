import Link from "next/link";
import { Plus, Search, ClipboardCheck, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listInspections, qualitySummary } from "@/lib/data/quality";
import { Button, Card, Badge, Input } from "@/components/ui";
import { ExportCsvButton } from "@/components/export-csv-button";
import { fmtDate } from "@/lib/utils";
import type { QualityInspectionType, QualityResult } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

export const resultTone: Record<QualityResult, Tone> = {
  pendente: "neutral",
  aprovado: "good",
  aprovado_condicional: "warn",
  reprovado: "danger",
};
export const resultLabel: Record<QualityResult, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  aprovado_condicional: "Aprovado c/ ressalvas",
  reprovado: "Reprovado",
};
export const typeLabel: Record<QualityInspectionType, string> = {
  recebimento: "Recebimento",
  producao: "Produção",
  auditoria: "Auditoria",
  outro: "Outro",
};

const RESULT_KEYS = Object.keys(resultLabel) as QualityResult[];
const TYPE_KEYS = Object.keys(typeLabel) as QualityInspectionType[];

export default async function QualidadePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; result?: string; type?: string }>;
}) {
  const session = await requireSession();
  const { q, result, type } = await searchParams;
  const resultFilter =
    result && (RESULT_KEYS as string[]).includes(result) ? (result as QualityResult) : undefined;
  const typeFilter =
    type && (TYPE_KEYS as string[]).includes(type) ? (type as QualityInspectionType) : undefined;

  const [rows, summary] = await Promise.all([
    listInspections(session.tenantId, { q, result: resultFilter, type: typeFilter }),
    qualitySummary(session.tenantId),
  ]);

  const csvColumns = [
    { key: "numero", label: "Inspeção" },
    { key: "tipo", label: "Tipo" },
    { key: "titulo", label: "Título" },
    { key: "fornecedor", label: "Fornecedor" },
    { key: "amostra", label: "Amostra" },
    { key: "defeitos", label: "Defeitos" },
    { key: "data", label: "Data" },
    { key: "resultado", label: "Resultado" },
  ];
  const csvRows = rows.map((r) => ({
    numero: r.inspectionNumber,
    tipo: typeLabel[r.inspectionType],
    titulo: r.title,
    fornecedor: r.supplierName ?? "",
    amostra: r.sampleSize,
    defeitos: r.defectsFound,
    data: r.inspectedAt ?? "",
    resultado: resultLabel[r.result],
  }));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Qualidade</h1>
          <p className="text-sm text-neutral-500">
            Inspeções de recebimento, produção e auditoria de fornecedores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton filename="inspecoes.csv" columns={csvColumns} rows={csvRows} />
          <Link href="/qualidade/new">
            <Button>
              <Plus size={16} /> Nova inspeção
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Inspeções"
          value={String(summary.total)}
          icon={<ClipboardCheck size={16} className="text-neutral-400" />}
        />
        <Kpi
          label="Taxa de aprovação"
          value={`${summary.approvalRate}%`}
          icon={<CheckCircle2 size={16} className="text-emerald-500" />}
        />
        <Kpi
          label="Reprovadas"
          value={String(summary.reproved)}
          icon={<XCircle size={16} className="text-red-500" />}
          tone={summary.reproved > 0 ? "danger" : undefined}
        />
        <Kpi
          label="NC abertas (críticas)"
          value={`${summary.openNc} (${summary.criticalNc})`}
          icon={<AlertTriangle size={16} className="text-amber-500" />}
          tone={summary.criticalNc > 0 ? "danger" : undefined}
        />
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Buscar</label>
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <Input name="q" defaultValue={q ?? ""} placeholder="Número ou título" className="pl-9" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Tipo</label>
          <select
            name="type"
            defaultValue={typeFilter ?? ""}
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Todos</option>
            {TYPE_KEYS.map((t) => (
              <option key={t} value={t}>
                {typeLabel[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Resultado</label>
          <select
            name="result"
            defaultValue={resultFilter ?? ""}
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Todos</option>
            {RESULT_KEYS.map((r) => (
              <option key={r} value={r}>
                {resultLabel[r]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {(q || resultFilter || typeFilter) && (
          <Link href="/qualidade" className="text-sm text-neutral-500 hover:underline">
            Limpar
          </Link>
        )}
      </form>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-3 font-medium">Inspeção</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Fornecedor</th>
              <th className="px-5 py-3 text-right font-medium">Amostra</th>
              <th className="px-5 py-3 text-right font-medium">Defeitos</th>
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="px-5 py-3 font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
              >
                <td className="px-5 py-3">
                  <Link
                    href={`/qualidade/${r.id}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {r.inspectionNumber}
                  </Link>
                  <div className="text-xs text-neutral-400">{r.title}</div>
                </td>
                <td className="px-5 py-3 text-neutral-500">{typeLabel[r.inspectionType]}</td>
                <td className="px-5 py-3">{r.supplierName ?? "—"}</td>
                <td className="px-5 py-3 text-right tabular-nums">{r.sampleSize}</td>
                <td className="px-5 py-3 text-right tabular-nums">{r.defectsFound}</td>
                <td className="px-5 py-3 tabular-nums text-neutral-500">{fmtDate(r.inspectedAt)}</td>
                <td className="px-5 py-3">
                  <Badge tone={resultTone[r.result]}>{resultLabel[r.result]}</Badge>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nenhuma inspeção registrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">{label}</span>
        {icon}
      </div>
      <div className={`mt-3 text-2xl font-bold tabular-nums ${tone === "danger" ? "text-red-600" : ""}`}>
        {value}
      </div>
    </Card>
  );
}
