import Link from "next/link";
import { Wallet, TrendingUp, AlertCircle, Target } from "lucide-react";
import { requireSession } from "@/lib/auth";
import {
  listReceivables,
  listInvoices,
  listPayments,
  listLedger,
  financeSummary,
  mgRealizedPercent,
} from "@/lib/data/finance";
import { listLicensees } from "@/lib/data/licensees";
import { parseView } from "@/lib/view";
import { Card, Badge, Button } from "@/components/ui";
import { ExportCsvButton } from "@/components/export-csv-button";
import { fmtMoney, fmtDate, fmtCompactBRL, fmtPct } from "@/lib/utils";
import type {
  ReceivableStatus,
  InvoiceStatus,
  PaymentMethod,
  LedgerEntryType,
} from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

const recvTone: Record<ReceivableStatus, Tone> = {
  previsto: "neutral",
  emitido: "info",
  parcial: "warn",
  pago: "good",
  vencido: "danger",
  cancelado: "neutral",
};
const recvLabel: Record<ReceivableStatus, string> = {
  previsto: "Previsto",
  emitido: "Emitido",
  parcial: "Parcial",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};
const invTone: Record<InvoiceStatus, Tone> = {
  rascunho: "neutral",
  emitida: "good",
  cancelada: "danger",
  substituida: "warn",
};
const invLabel: Record<InvoiceStatus, string> = {
  rascunho: "Rascunho",
  emitida: "Emitida",
  cancelada: "Cancelada",
  substituida: "Substituída",
};
const methodLabel: Record<PaymentMethod, string> = {
  boleto: "Boleto",
  pix: "PIX",
  ted: "TED",
  wire_transfer: "Wire",
  cartao: "Cartão",
  outro: "Outro",
};
const ledgerLabel: Record<LedgerEntryType, string> = {
  royalty: "Royalty",
  minimum_guarantee: "Garantia mínima",
  advance: "Adiantamento",
  initial_fee: "Taxa inicial",
  annual_fee: "Anuidade",
  marketing_fee: "Marketing",
  renewal_fee: "Renovação",
  penalty: "Multa",
  tax: "Tributo",
  adjustment: "Ajuste",
};

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ licensee?: string; view?: string }>;
}) {
  const session = await requireSession();
  const { licensee: licenseeParam, view: viewParam } = await searchParams;
  const view = parseView(viewParam);
  const licensees = await listLicensees(session.tenantId);
  const licenseeId =
    (licenseeParam && licensees.some((l) => l.id === licenseeParam) ? licenseeParam : undefined) ??
    (view?.dim === "licenciado" ? view.id : undefined);
  const filter = { licenseeId };

  const [receivables, invoices, payments, ledger, summary, mgPct] = await Promise.all([
    listReceivables(session.tenantId, filter),
    listInvoices(session.tenantId, filter),
    listPayments(session.tenantId, filter),
    listLedger(session.tenantId, filter),
    financeSummary(session.tenantId),
    mgRealizedPercent(session.tenantId),
  ]);

  const recvCsvColumns = [
    { key: "descricao", label: "Descrição" },
    { key: "licenciado", label: "Licenciado" },
    { key: "vencimento", label: "Vencimento" },
    { key: "valor", label: "Valor" },
    { key: "pago", label: "Pago" },
    { key: "em_aberto", label: "Em aberto" },
    { key: "status", label: "Status" },
  ];
  const recvCsvRows = receivables.map((r) => ({
    descricao: r.description ?? "",
    licenciado: r.licenseeName ?? "",
    vencimento: r.dueDate,
    valor: Number(r.amount),
    pago: Number(r.paidAmount),
    em_aberto: Number(r.amount) - Number(r.paidAmount),
    status: recvLabel[r.status],
  }));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Financeiro</h1>
        <p className="text-sm text-neutral-500">
          Recebíveis, faturas, pagamentos e razão — consolidado do Supabase
        </p>
      </div>

      <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px]">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Licenciado</label>
          <select
            name="licensee"
            defaultValue={licenseeId ?? ""}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Todos os licenciados</option>
            {licensees.map((l) => (
              <option key={l.id} value={l.id}>
                {l.legalName}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {licenseeId && (
          <Link href="/financeiro" className="text-sm text-neutral-500 hover:underline">
            Limpar
          </Link>
        )}
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="A receber" value={fmtCompactBRL(summary.outstanding)} icon={<Wallet size={18} className="text-blue-600" />} />
        <Kpi label="Recebido" value={fmtCompactBRL(summary.received)} icon={<TrendingUp size={18} className="text-emerald-600" />} />
        <Kpi label="Vencido" value={fmtCompactBRL(summary.overdue)} icon={<AlertCircle size={18} className="text-red-500" />} tone={summary.overdue > 0 ? "danger" : undefined} />
        <Kpi label="Garantia mínima realizada" value={fmtPct(mgPct)} icon={<Target size={18} className="text-violet-600" />} />
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        <div className="flex items-center justify-between p-5 pb-2">
          <h2 className="text-sm font-semibold">Recebíveis</h2>
          <ExportCsvButton filename="recebiveis.csv" columns={recvCsvColumns} rows={recvCsvRows} />
        </div>
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-2 font-medium">Descrição</th>
              <th className="px-5 py-2 font-medium">Licenciado</th>
              <th className="px-5 py-2 font-medium">Vencimento</th>
              <th className="px-5 py-2 text-right font-medium">Valor</th>
              <th className="px-5 py-2 text-right font-medium">Em aberto</th>
              <th className="px-5 py-2 font-medium">Status</th>
              <th className="px-5 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {receivables.map((r) => {
              const iso = r.currencyIso ?? "BRL";
              const outstanding = Number(r.amount) - Number(r.paidAmount);
              const open = r.status !== "pago" && r.status !== "cancelado" && outstanding > 0;
              return (
                <tr key={r.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-5 py-2">{r.description ?? "—"}</td>
                  <td className="px-5 py-2">{r.licenseeName ?? "—"}</td>
                  <td className="px-5 py-2 tabular-nums">{fmtDate(r.dueDate)}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{fmtMoney(r.amount, iso)}</td>
                  <td className="px-5 py-2 text-right tabular-nums">
                    {outstanding > 0 ? fmtMoney(outstanding, iso) : "—"}
                  </td>
                  <td className="px-5 py-2">
                    <Badge tone={recvTone[r.status]}>{recvLabel[r.status]}</Badge>
                  </td>
                  <td className="px-5 py-2 text-right">
                    <Link
                      href={`/financeiro/${r.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {open ? "Registrar pagamento" : "Ver"}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {receivables.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-sm text-neutral-400">
                  Nenhum recebível.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="overflow-x-auto p-0">
          <div className="p-5 pb-2">
            <h2 className="text-sm font-semibold">Faturas</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                <th className="px-5 py-2 font-medium">Número</th>
                <th className="px-5 py-2 font-medium">Emissão</th>
                <th className="px-5 py-2 text-right font-medium">Valor</th>
                <th className="px-5 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-5 py-2 font-medium">{i.invoiceNumber}</td>
                  <td className="px-5 py-2 tabular-nums">{fmtDate(i.issueDate)}</td>
                  <td className="px-5 py-2 text-right tabular-nums">
                    {fmtMoney(i.netAmount, i.currencyIso ?? "BRL")}
                  </td>
                  <td className="px-5 py-2">
                    <Badge tone={invTone[i.status]}>{invLabel[i.status]}</Badge>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-neutral-400">
                    Nenhuma fatura emitida.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card className="overflow-x-auto p-0">
          <div className="p-5 pb-2">
            <h2 className="text-sm font-semibold">Pagamentos recebidos</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                <th className="px-5 py-2 font-medium">Data</th>
                <th className="px-5 py-2 font-medium">Referência</th>
                <th className="px-5 py-2 font-medium">Método</th>
                <th className="px-5 py-2 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-5 py-2 tabular-nums">{fmtDate(p.paidAt)}</td>
                  <td className="px-5 py-2">{p.description ?? p.reference ?? "—"}</td>
                  <td className="px-5 py-2">{methodLabel[p.method]}</td>
                  <td className="px-5 py-2 text-right font-medium tabular-nums text-emerald-600">
                    {fmtMoney(p.amount, p.currencyIso ?? "BRL")}
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-neutral-400">
                    Nenhum pagamento registrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>

      <Card className="mt-6 overflow-x-auto p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Razão (movimentações)</h2>
        </div>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-2 font-medium">Data</th>
              <th className="px-5 py-2 font-medium">Tipo</th>
              <th className="px-5 py-2 font-medium">Descrição</th>
              <th className="px-5 py-2 font-medium">Licenciado</th>
              <th className="px-5 py-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {ledger.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="px-5 py-2 tabular-nums">{fmtDate(e.entryDate)}</td>
                <td className="px-5 py-2">
                  <Badge tone="neutral">{ledgerLabel[e.entryType]}</Badge>
                </td>
                <td className="px-5 py-2 text-neutral-600 dark:text-neutral-300">{e.description ?? "—"}</td>
                <td className="px-5 py-2">{e.licenseeName ?? "—"}</td>
                <td className="px-5 py-2 text-right tabular-nums">
                  {fmtMoney(e.amount, e.currencyIso ?? "BRL")}
                </td>
              </tr>
            ))}
            {ledger.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-neutral-400">
                  Sem movimentações.
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
