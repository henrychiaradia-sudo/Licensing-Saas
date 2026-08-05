import Link from "next/link";
import { Plus, FileSignature, Wallet, CalendarClock, Layers } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listSupplyContracts, supplyContractSummary } from "@/lib/data/supply-contracts";
import { Button, Card, Badge } from "@/components/ui";
import { ExportCsvButton } from "@/components/export-csv-button";
import { fmtCompactBRL, fmtMoney, fmtDate } from "@/lib/utils";
import type { SupplyContractStatus } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

export const supplyStatusTone: Record<SupplyContractStatus, Tone> = {
  rascunho: "neutral",
  vigente: "good",
  suspenso: "warn",
  encerrado: "neutral",
  renovado: "info",
};
export const supplyStatusLabel: Record<SupplyContractStatus, string> = {
  rascunho: "Rascunho",
  vigente: "Vigente",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
  renovado: "Renovado",
};

const STATUS_FILTERS: SupplyContractStatus[] = [
  "rascunho",
  "vigente",
  "suspenso",
  "encerrado",
  "renovado",
];

export default async function ContratosFornecimentoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const session = await requireSession();
  const { status, q } = await searchParams;
  const statusFilter =
    status && (STATUS_FILTERS as readonly string[]).includes(status)
      ? (status as SupplyContractStatus)
      : undefined;

  const [rows, summary] = await Promise.all([
    listSupplyContracts(session.tenantId, { status: statusFilter, q }),
    supplyContractSummary(session.tenantId),
  ]);

  const csvColumns = [
    { key: "numero", label: "Número" },
    { key: "titulo", label: "Título" },
    { key: "fornecedor", label: "Fornecedor" },
    { key: "status", label: "Status" },
    { key: "valor", label: "Valor total" },
    { key: "inicio", label: "Início" },
    { key: "fim", label: "Fim" },
  ];
  const csvRows = rows.map((r) => ({
    numero: r.contractNumber,
    titulo: r.title,
    fornecedor: r.supplierName ?? "",
    status: supplyStatusLabel[r.status],
    valor: fmtMoney(r.totalValue, r.currency),
    inicio: r.startDate ? fmtDate(r.startDate) : "",
    fim: r.endDate ? fmtDate(r.endDate) : "",
  }));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Contratos de Fornecimento</h1>
          <p className="text-sm text-neutral-500">
            Acordos-mestre com fornecedores — SLA, vigência e renovação
          </p>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton filename="contratos-fornecimento.csv" columns={csvColumns} rows={csvRows} />
          <Link href="/contratos-fornecimento/new">
            <Button>
              <Plus size={16} /> Novo contrato
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Vigentes" value={String(summary.active)} icon={<FileSignature size={16} className="text-emerald-500" />} />
        <Kpi label="Valor contratado" value={fmtCompactBRL(Number(summary.totalValue))} hint="contratos vigentes" icon={<Wallet size={16} className="text-blue-500" />} />
        <Kpi label="A vencer (90 dias)" value={String(summary.expiring)} icon={<CalendarClock size={16} className="text-amber-500" />} />
        <Kpi label="Total de contratos" value={String(summary.total)} icon={<Layers size={16} className="text-neutral-400" />} />
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Buscar</label>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Número ou título"
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
                {supplyStatusLabel[s]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {(statusFilter || q) && (
          <Link href="/contratos-fornecimento" className="text-sm text-neutral-500 hover:underline">
            Limpar
          </Link>
        )}
      </form>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th scope="col" className="px-5 py-3 font-medium">Contrato</th>
              <th scope="col" className="px-5 py-3 font-medium">Fornecedor</th>
              <th scope="col" className="px-5 py-3 font-medium">Status</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Valor total</th>
              <th scope="col" className="px-5 py-3 font-medium">Vigência</th>
              <th scope="col" className="px-5 py-3 font-medium">Renovação</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
                <td className="px-5 py-3">
                  <Link href={`/contratos-fornecimento/${r.id}`} className="font-medium text-blue-600 hover:underline">
                    {r.title}
                  </Link>
                  <div className="text-[11px] text-neutral-400">{r.contractNumber}</div>
                </td>
                <td className="px-5 py-3 text-neutral-500">{r.supplierName ?? "—"}</td>
                <td className="px-5 py-3">
                  <Badge tone={supplyStatusTone[r.status]}>{supplyStatusLabel[r.status]}</Badge>
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{fmtMoney(r.totalValue, r.currency)}</td>
                <td className="px-5 py-3 tabular-nums text-neutral-500">
                  {r.startDate ? `${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}` : "—"}
                </td>
                <td className="px-5 py-3">
                  {r.autoRenew ? <Badge tone="info">Automática</Badge> : <span className="text-neutral-400">Manual</span>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nenhum contrato de fornecimento encontrado.
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
