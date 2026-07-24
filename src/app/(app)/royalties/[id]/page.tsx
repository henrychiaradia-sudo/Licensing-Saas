import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { getRoyaltyReportDetail, getContractRoyaltyRule, getReportInvoice } from "@/lib/data/royalties";
import { approveReportAction, rejectReportAction } from "../actions";
import { RoyaltyBreakdown } from "@/components/royalty-breakdown";
import { Card, Badge, Button } from "@/components/ui";
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

function pctRate(rate: string | null) {
  if (rate === null) return "—";
  const v = Number(rate);
  if (Number.isNaN(v)) return "—";
  const asPct = v <= 1 ? v * 100 : v;
  return asPct.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%";
}

export default async function RoyaltyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getRoyaltyReportDetail(session.tenantId, id);
  if (!data) notFound();

  const { report: r, lines, validations } = data;
  const iso = r.currencyIso ?? "BRL";
  const reportInvoice =
    r.status === "aprovado" ? await getReportInvoice(session.tenantId, r.id) : null;
  const { rule, tiers } = r.contractId
    ? await getContractRoyaltyRule(session.tenantId, r.contractId)
    : { rule: null, tiers: [] };
  const royaltyBase = lines.reduce((a, l) => a + Number(l.royaltyBaseAmt || 0), 0);
  const variance = Number(r.variance);
  const canAct =
    can(session, PERMISSIONS.royaltyApprove) &&
    r.status !== "aprovado" &&
    r.status !== "rejeitado";

  return (
    <div>
      <Link
        href="/royalties"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Royalties
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Royalties · {r.referenceLabel}</h1>
          <p className="text-sm text-neutral-500">
            {r.licenseeName} · {r.contractNumber} · {fmtDate(r.periodStart)} a {fmtDate(r.periodEnd)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>
          {canAct && (
            <>
              <form action={rejectReportAction.bind(null, r.id)}>
                <Button type="submit" variant="outline">
                  <XCircle size={15} /> Rejeitar
                </Button>
              </form>
              <form action={approveReportAction.bind(null, r.id)}>
                <Button type="submit">
                  <CheckCircle2 size={15} /> Aprovar e faturar
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Vendas líquidas" value={fmtMoney(r.netSalesTotal, iso)} />
        <Kpi label="Royalty declarado" value={fmtMoney(r.royaltyDeclared, iso)} />
        <Kpi label="Royalty calculado" value={fmtMoney(r.royaltyCalculated, iso)} highlight />
        <Kpi
          label="Variância"
          value={variance !== 0 ? fmtMoney(r.variance, iso) : "Sem divergência"}
          tone={variance !== 0 ? "warn" : "good"}
        />
      </div>

      {variance !== 0 && (
        <Card className="mt-4 flex items-start gap-3 border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            O royalty calculado difere do declarado em{" "}
            <strong>{fmtMoney(Math.abs(variance), iso)}</strong>. Revise as validações abaixo antes de
            aprovar.
          </p>
        </Card>
      )}

      {r.status === "aprovado" && (
        <Card className="mt-4 flex items-start gap-3 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <div className="text-sm text-emerald-800 dark:text-emerald-300">
            <p>
              Relatório aprovado e faturado — o recebível foi gerado e já aparece no Financeiro e no
              portal do licenciado.
            </p>
            {reportInvoice && (
              <p className="mt-1 font-medium">
                Nota de débito <strong>{reportInvoice.invoiceNumber}</strong> emitida em{" "}
                {fmtDate(reportInvoice.issueDate)} · {fmtMoney(reportInvoice.netAmount, iso)} · vence{" "}
                {fmtDate(reportInvoice.dueDate)}.
              </p>
            )}
          </div>
        </Card>
      )}

      <RoyaltyBreakdown
        rule={rule}
        tiers={tiers}
        base={royaltyBase}
        iso={iso}
        storedRoyalty={Number(r.royaltyCalculated)}
      />

      <Card className="mt-4 overflow-x-auto p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Linhas do relatório</h2>
        </div>
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-2 font-medium">SKU / Produto</th>
              <th className="px-5 py-2 text-right font-medium">Unidades</th>
              <th className="px-5 py-2 text-right font-medium">Vendas líq.</th>
              <th className="px-5 py-2 text-right font-medium">Base</th>
              <th className="px-5 py-2 text-right font-medium">Taxa</th>
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
                <td className="px-5 py-2 text-right tabular-nums">
                  {Number(l.units).toLocaleString("pt-BR")}
                </td>
                <td className="px-5 py-2 text-right tabular-nums">{fmtMoney(l.netAmount, iso)}</td>
                <td className="px-5 py-2 text-right tabular-nums">{fmtMoney(l.royaltyBaseAmt, iso)}</td>
                <td className="px-5 py-2 text-right tabular-nums">{pctRate(l.royaltyRate)}</td>
                <td className="px-5 py-2 text-right font-medium tabular-nums">
                  {fmtMoney(l.royaltyAmount, iso)}
                </td>
              </tr>
            ))}
            {lines.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-neutral-400">
                  Sem linhas detalhadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold">Validações automáticas</h2>
        {validations.length ? (
          <ul className="space-y-2">
            {validations.map((v) => (
              <li key={v.id} className="flex items-start gap-2 text-sm">
                <SeverityIcon severity={v.severity} />
                <div>
                  <span className="font-medium">{v.ruleCode}</span> — {v.message}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-400">Nenhuma validação registrada.</p>
        )}
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "warn" | "good";
}) {
  const color =
    tone === "warn" ? "text-amber-600" : tone === "good" ? "text-emerald-600" : highlight ? "text-blue-600" : "";
  return (
    <Card className="p-5">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div className={`mt-2 text-lg font-bold tabular-nums ${color}`}>{value}</div>
    </Card>
  );
}

function SeverityIcon({ severity }: { severity: ValidationSeverity }) {
  if (severity === "error") return <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />;
  if (severity === "warning") return <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />;
  return <Info size={16} className="mt-0.5 shrink-0 text-blue-500" />;
}
