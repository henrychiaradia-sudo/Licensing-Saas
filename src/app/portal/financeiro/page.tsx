import { Wallet } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { listPortalReceivables, listPortalPayments } from "@/lib/data/portal";
import { Card, Badge } from "@/components/ui";
import { fmtMoney, fmtDate, fmtCompactBRL } from "@/lib/utils";
import type { ReceivableStatus, PaymentMethod } from "@/lib/db/schema";

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
  emitido: "Em aberto",
  parcial: "Parcial",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};
const methodLabel: Record<PaymentMethod, string> = {
  boleto: "Boleto",
  pix: "PIX",
  ted: "TED",
  wire_transfer: "Wire",
  cartao: "Cartão",
  outro: "Outro",
};

export default async function PortalFinanceiro() {
  const session = await requireLicenseeSession();
  const [receivables, payments] = await Promise.all([
    listPortalReceivables(session.tenantId, session.licenseeId),
    listPortalPayments(session.tenantId, session.licenseeId),
  ]);
  const outstanding = receivables
    .filter((r) => r.status !== "pago" && r.status !== "cancelado")
    .reduce((a, r) => a + (Number(r.amount) - Number(r.paidAmount)), 0);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Financeiro</h1>
        <p className="text-sm text-neutral-500">Valores a pagar e histórico de pagamentos</p>
      </div>

      <Card className="mb-6 max-w-xs p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-neutral-500">Total a pagar</span>
          <Wallet size={18} className="text-red-500" />
        </div>
        <div className="mt-3 text-2xl font-bold tabular-nums">{fmtCompactBRL(outstanding)}</div>
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Valores a pagar</h2>
        </div>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-2 font-medium">Descrição</th>
              <th className="px-5 py-2 font-medium">Vencimento</th>
              <th className="px-5 py-2 text-right font-medium">Valor</th>
              <th className="px-5 py-2 text-right font-medium">Em aberto</th>
              <th className="px-5 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {receivables.map((r) => {
              const iso = r.currencyIso ?? "BRL";
              const open = Number(r.amount) - Number(r.paidAmount);
              return (
                <tr key={r.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-5 py-2">{r.description ?? "—"}</td>
                  <td className="px-5 py-2 tabular-nums">{fmtDate(r.dueDate)}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{fmtMoney(r.amount, iso)}</td>
                  <td className="px-5 py-2 text-right tabular-nums">{open > 0 ? fmtMoney(open, iso) : "—"}</td>
                  <td className="px-5 py-2">
                    <Badge tone={recvTone[r.status]}>{recvLabel[r.status]}</Badge>
                  </td>
                </tr>
              );
            })}
            {receivables.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-neutral-400">
                  Nenhum valor em aberto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Card className="mt-6 overflow-x-auto p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Pagamentos realizados</h2>
        </div>
        <table className="w-full min-w-[520px] text-sm">
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
                <td className="px-5 py-2">{p.description ?? "—"}</td>
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
  );
}
