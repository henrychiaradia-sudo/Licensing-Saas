import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { getPortalReport } from "@/lib/data/portal";
import { Card, Badge } from "@/components/ui";
import { fmtMoney, fmtDate } from "@/lib/utils";
import type { RoyaltyReportStatus, ValidationSeverity } from "@/lib/db/schema";

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

export default async function PortalReportDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireLicenseeSession();
  const data = await getPortalReport(session.tenantId, session.licenseeId, id);
  if (!data) notFound();
  const { report: r, lines, validations } = data;
  const iso = r.currencyIso ?? "BRL";

  return (
    <div>
      <Link href="/portal/royalties" className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-emerald-700">
        <ArrowLeft size={15} /> Reportes de Royalties
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Reporte {r.referenceLabel}</h1>
          <p className="text-sm text-neutral-500">
            {r.contractNumber} · enviado em {fmtDate(r.submittedAt)}
          </p>
        </div>
        <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Vendas brutas" value={fmtMoney(r.grossSalesTotal, iso)} />
        <Kpi label="Vendas líquidas" value={fmtMoney(r.netSalesTotal, iso)} />
        <Kpi label="Unidades" value={Number(r.unitsTotal).toLocaleString("pt-BR")} />
        <Kpi label="Royalty devido" value={fmtMoney(r.royaltyCalculated, iso)} highlight />
      </div>

      {r.status === "com_divergencia" && (
        <Card className="mt-4 flex items-start gap-3 border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Este reporte apresentou divergências. Revise os pontos abaixo e reenvie uma versão corrigida.
          </p>
        </Card>
      )}

      <Card className="mt-4 overflow-x-auto p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Linhas do reporte</h2>
        </div>
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-2 font-medium">SKU / Produto</th>
              <th className="px-5 py-2 text-right font-medium">Unid.</th>
              <th className="px-5 py-2 text-right font-medium">Bruto</th>
              <th className="px-5 py-2 text-right font-medium">Líquido</th>
              <th className="px-5 py-2 text-right font-medium">Royalty</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="px-5 py-2">
                  <div className="font-medium">{l.productName ?? "—"}</div>
                  <div className="text-xs text-neutral-400">{l.sku ?? "—"}</div>
                </td>
                <td className="px-5 py-2 text-right tabular-nums">{Number(l.units).toLocaleString("pt-BR")}</td>
                <td className="px-5 py-2 text-right tabular-nums">{fmtMoney(l.grossAmount, iso)}</td>
                <td className="px-5 py-2 text-right tabular-nums">{fmtMoney(l.netAmount, iso)}</td>
                <td className="px-5 py-2 text-right font-medium tabular-nums">{fmtMoney(l.royaltyAmount, iso)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold">Validações</h2>
        {validations.length ? (
          <ul className="space-y-2">
            {validations.map((v) => (
              <li key={v.id} className="flex items-start gap-2 text-sm">
                <Sev severity={v.severity} />
                <span>{v.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={16} /> Nenhuma divergência encontrada.
          </p>
        )}
      </Card>
    </div>
  );
}

function Kpi({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className="p-5">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div className={`mt-2 text-lg font-bold tabular-nums ${highlight ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
        {value}
      </div>
    </Card>
  );
}

function Sev({ severity }: { severity: ValidationSeverity }) {
  if (severity === "error") return <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />;
  if (severity === "warning") return <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />;
  return <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />;
}
