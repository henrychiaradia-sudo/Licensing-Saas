import Link from "next/link";
import { Plus, Scale, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listLegalCases, legalSummary } from "@/lib/data/legal";
import { Button, Card, Badge } from "@/components/ui";
import { ExportCsvButton } from "@/components/export-csv-button";
import { fmtCompactBRL, fmtBRL, fmtDate } from "@/lib/utils";
import type { LegalCaseStatus, LegalCaseType, LegalCasePriority } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

export const legalStatusTone: Record<LegalCaseStatus, Tone> = {
  aberto: "info",
  em_andamento: "warn",
  suspenso: "neutral",
  encerrado: "good",
  arquivado: "neutral",
};
export const legalStatusLabel: Record<LegalCaseStatus, string> = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
  arquivado: "Arquivado",
};
export const legalTypeLabel: Record<LegalCaseType, string> = {
  contencioso: "Contencioso",
  consultivo: "Consultivo",
  contratual: "Contratual",
  propriedade_intelectual: "Propriedade intelectual",
  trabalhista: "Trabalhista",
  tributario: "Tributário",
};
export const legalPriorityTone: Record<LegalCasePriority, Tone> = {
  baixa: "neutral",
  media: "info",
  alta: "warn",
  critica: "danger",
};
export const legalPriorityLabel: Record<LegalCasePriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

const STATUS_FILTERS: LegalCaseStatus[] = [
  "aberto",
  "em_andamento",
  "suspenso",
  "encerrado",
  "arquivado",
];

export default async function JuridicoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await requireSession();
  const { status, q } = await searchParams;
  const statusFilter =
    status && (STATUS_FILTERS as readonly string[]).includes(status)
      ? (status as LegalCaseStatus)
      : undefined;

  const [rows, summary] = await Promise.all([
    listLegalCases(session.tenantId, { status: statusFilter, q }),
    legalSummary(session.tenantId),
  ]);

  const csvColumns = [
    { key: "numero", label: "Número" },
    { key: "titulo", label: "Título" },
    { key: "tipo", label: "Tipo" },
    { key: "status", label: "Status" },
    { key: "prioridade", label: "Prioridade" },
    { key: "contraparte", label: "Contraparte" },
    { key: "risco", label: "Valor em risco" },
    { key: "prazo", label: "Próximo prazo" },
  ];
  const csvRows = rows.map((r) => ({
    numero: r.caseNumber,
    titulo: r.title,
    tipo: legalTypeLabel[r.caseType],
    status: legalStatusLabel[r.status],
    prioridade: legalPriorityLabel[r.priority],
    contraparte: r.counterparty ?? "",
    risco: fmtBRL(Number(r.amountAtRisk)),
    prazo: r.dueDate ? fmtDate(r.dueDate) : "",
  }));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Jurídico</h1>
          <p className="text-sm text-neutral-500">
            Casos e processos — contencioso, PI, contratos e consultivo
          </p>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton filename="juridico.csv" columns={csvColumns} rows={csvRows} />
          <Link href="/juridico/new">
            <Button>
              <Plus size={16} /> Novo caso
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Casos abertos" value={String(summary.open)} icon={<Scale size={16} className="text-blue-500" />} />
        <Kpi label="Valor em risco" value={fmtCompactBRL(Number(summary.atRisk))} hint="casos em aberto" icon={<AlertTriangle size={16} className="text-amber-500" />} />
        <Kpi label="Críticos abertos" value={String(summary.critical)} icon={<ShieldAlert size={16} className="text-red-500" />} />
        <Kpi label="Encerrados no ano" value={String(summary.closedYear)} icon={<CheckCircle2 size={16} className="text-emerald-500" />} />
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Buscar</label>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Número, título ou contraparte"
            className="h-10 w-64 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Todos</option>
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {legalStatusLabel[s]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {(statusFilter || q) && (
          <Link href="/juridico" className="text-sm text-neutral-500 hover:underline">
            Limpar
          </Link>
        )}
      </form>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th scope="col" className="px-5 py-3 font-medium">Caso</th>
              <th scope="col" className="px-5 py-3 font-medium">Tipo</th>
              <th scope="col" className="px-5 py-3 font-medium">Prioridade</th>
              <th scope="col" className="px-5 py-3 font-medium">Status</th>
              <th scope="col" className="px-5 py-3 font-medium">Contraparte</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Valor em risco</th>
              <th scope="col" className="px-5 py-3 font-medium">Prazo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
                <td className="px-5 py-3">
                  <Link href={`/juridico/${r.id}`} className="font-medium text-blue-600 hover:underline">
                    {r.title}
                  </Link>
                  <div className="text-[11px] text-neutral-400">
                    {r.caseNumber}
                    {r.brandName ? ` · ${r.brandName}` : ""}
                  </div>
                </td>
                <td className="px-5 py-3 text-neutral-500">{legalTypeLabel[r.caseType]}</td>
                <td className="px-5 py-3">
                  <Badge tone={legalPriorityTone[r.priority]}>{legalPriorityLabel[r.priority]}</Badge>
                </td>
                <td className="px-5 py-3">
                  <Badge tone={legalStatusTone[r.status]}>{legalStatusLabel[r.status]}</Badge>
                </td>
                <td className="px-5 py-3 text-neutral-500">{r.counterparty ?? "—"}</td>
                <td className="px-5 py-3 text-right tabular-nums">{fmtBRL(Number(r.amountAtRisk))}</td>
                <td className="px-5 py-3 tabular-nums text-neutral-500">{r.dueDate ? fmtDate(r.dueDate) : "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nenhum caso jurídico encontrado.
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
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-neutral-400">{hint}</div>}
    </Card>
  );
}
