import Link from "next/link";
import { Search } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listRoyaltyReports } from "@/lib/data/royalties";
import { Card, Badge, Input } from "@/components/ui";
import { ExportCsvButton } from "@/components/export-csv-button";
import { HighlightScroll } from "@/components/highlight-scroll";
import { fmtMoney } from "@/lib/utils";
import type { RoyaltyReportStatus } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

const statusTone: Record<RoyaltyReportStatus, Tone> = {
  rascunho: "neutral",
  enviado: "info",
  em_validacao: "info",
  com_divergencia: "warn",
  aprovado: "good",
  rejeitado: "danger",
};
const statusLabel: Record<RoyaltyReportStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  em_validacao: "Em validação",
  com_divergencia: "Com divergência",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

const STATUS_KEYS = Object.keys(statusLabel) as RoyaltyReportStatus[];

export default async function RoyaltiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; highlight?: string }>;
}) {
  const session = await requireSession();
  const { q, status, highlight } = await searchParams;
  const statusFilter =
    status && (STATUS_KEYS as string[]).includes(status)
      ? (status as RoyaltyReportStatus)
      : undefined;
  const reports = await listRoyaltyReports(session.tenantId, { q, status: statusFilter });

  // Highlight vindo do card "Royalties pendentes" do dashboard.
  const PENDING = new Set(["enviado", "em_validacao", "com_divergencia"]);
  const isHl = (r: (typeof reports)[number]) => highlight === "pendentes" && PENDING.has(r.status);
  const firstHlId = reports.find(isHl)?.id;
  const HL = "bg-amber-50 ring-2 ring-inset ring-amber-300 dark:bg-amber-950/30 dark:ring-amber-500/40";

  const csvColumns = [
    { key: "competencia", label: "Competência" },
    { key: "contrato", label: "Contrato" },
    { key: "licenciado", label: "Licenciado" },
    { key: "vendas_liquidas", label: "Vendas líquidas" },
    { key: "royalty_declarado", label: "Royalty declarado" },
    { key: "royalty_calculado", label: "Royalty calculado" },
    { key: "variancia", label: "Variância" },
    { key: "status", label: "Status" },
  ];
  const csvRows = reports.map((r) => ({
    competencia: r.referenceLabel,
    contrato: r.contractNumber ?? "",
    licenciado: r.licenseeName ?? "",
    vendas_liquidas: Number(r.netSalesTotal),
    royalty_declarado: Number(r.royaltyDeclared),
    royalty_calculado: Number(r.royaltyCalculated),
    variancia: Number(r.variance),
    status: statusLabel[r.status],
  }));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Royalties</h1>
          <p className="text-sm text-neutral-500">
            Relatórios de vendas, cálculo de royalties e divergências
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="info">{reports.length} relatório(s)</Badge>
          <ExportCsvButton filename="royalties.csv" columns={csvColumns} rows={csvRows} />
        </div>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Buscar</label>
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Competência, licenciado ou contrato"
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Todos</option>
            {STATUS_KEYS.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-10 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-medium hover:border-blue-500 dark:border-neutral-700 dark:bg-neutral-900"
        >
          Filtrar
        </button>
        {(q || statusFilter) && (
          <Link href="/royalties" className="text-sm text-neutral-500 hover:underline">
            Limpar
          </Link>
        )}
      </form>

      {highlight === "pendentes" && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <span>Destacando royalties pendentes de validação/aprovação.</span>
          <Link href="/royalties" className="ml-auto text-xs font-medium hover:underline">
            Limpar destaque
          </Link>
        </div>
      )}
      {highlight && <HighlightScroll />}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-3 font-medium">Competência</th>
              <th className="px-5 py-3 font-medium">Licenciado</th>
              <th className="px-5 py-3 text-right font-medium">Vendas líq.</th>
              <th className="px-5 py-3 text-right font-medium">Declarado</th>
              <th className="px-5 py-3 text-right font-medium">Calculado</th>
              <th className="px-5 py-3 text-right font-medium">Variância</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => {
              const iso = r.currencyIso ?? "BRL";
              const variance = Number(r.variance);
              const hl = isHl(r);
              return (
                <tr
                  key={r.id}
                  id={r.id === firstHlId ? "hl-first" : undefined}
                  className={`border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50${hl ? " " + HL : ""}`}
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/royalties/${r.id}`}
                      className="font-semibold text-blue-600 hover:underline"
                    >
                      {r.referenceLabel}
                    </Link>
                    <div className="text-xs text-neutral-400">{r.contractNumber ?? "—"}</div>
                  </td>
                  <td className="px-5 py-3">{r.licenseeName ?? "—"}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {fmtMoney(r.netSalesTotal, iso)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {fmtMoney(r.royaltyDeclared, iso)}
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">
                    {fmtMoney(r.royaltyCalculated, iso)}
                  </td>
                  <td
                    className={`px-5 py-3 text-right tabular-nums ${
                      variance !== 0 ? "font-semibold text-amber-600" : "text-neutral-400"
                    }`}
                  >
                    {variance !== 0 ? fmtMoney(r.variance, iso) : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>
                  </td>
                </tr>
              );
            })}
            {reports.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nenhum relatório de royalties.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
