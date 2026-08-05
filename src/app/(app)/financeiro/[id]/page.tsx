import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getReceivableDetail } from "@/lib/data/finance";
import { Card, Badge } from "@/components/ui";
import { fmtMoney, fmtDate } from "@/lib/utils";
import { PaymentForm } from "./payment-form";
import type { ReceivableStatus, PaymentMethod } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";
const statusTone: Record<ReceivableStatus, Tone> = {
  previsto: "neutral",
  emitido: "info",
  parcial: "warn",
  pago: "good",
  vencido: "danger",
  cancelado: "neutral",
};
const statusLabel: Record<ReceivableStatus, string> = {
  previsto: "Previsto",
  emitido: "Emitido",
  parcial: "Parcial",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};
const methodLabel: Record<PaymentMethod, string> = {
  boleto: "Boleto",
  pix: "PIX",
  ted: "TED",
  wire_transfer: "Wire transfer",
  cartao: "Cartão",
  outro: "Outro",
};

export default async function ReceivableDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getReceivableDetail(session.tenantId, id);
  if (!data) notFound();

  const { receivable: r, payments } = data;
  const iso = r.currencyIso ?? "BRL";
  const outstanding = Number(r.amount) - Number(r.paidAmount);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <Link
        href="/financeiro"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Financeiro
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{r.description ?? "Recebível"}</h1>
          <p className="text-sm text-neutral-500">
            {r.licenseeName ?? "—"}
            {r.contractNumber ? ` · ${r.contractNumber}` : ""}
          </p>
        </div>
        <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Valor" value={fmtMoney(r.amount, iso)} />
        <Kpi label="Pago" value={fmtMoney(r.paidAmount, iso)} tone="good" />
        <Kpi label="Em aberto" value={fmtMoney(Math.max(0, outstanding), iso)} tone={outstanding > 0 ? "warn" : undefined} />
        <Kpi label="Vencimento" value={fmtDate(r.dueDate)} />
      </div>

      {outstanding > 0 ? (
        <Card className="mt-4 p-5">
          <h2 className="mb-4 text-sm font-semibold">Registrar pagamento</h2>
          <PaymentForm receivableId={r.id} outstanding={Math.round(outstanding * 100) / 100} today={today} />
        </Card>
      ) : (
        <Card className="mt-4 flex items-start gap-3 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-800 dark:text-emerald-300">
            Recebível quitado — nenhum valor em aberto.
          </p>
        </Card>
      )}

      <Card className="mt-4 overflow-x-auto p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Pagamentos</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th scope="col" className="px-5 py-2 font-medium">Data</th>
              <th scope="col" className="px-5 py-2 font-medium">Método</th>
              <th scope="col" className="px-5 py-2 font-medium">Referência</th>
              <th scope="col" className="px-5 py-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="px-5 py-2 tabular-nums">{fmtDate(p.paidAt)}</td>
                <td className="px-5 py-2">{methodLabel[p.method]}</td>
                <td className="px-5 py-2 text-neutral-500">{p.reference ?? "—"}</td>
                <td className="px-5 py-2 text-right font-medium tabular-nums text-emerald-600">
                  {fmtMoney(p.amount, iso)}
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-neutral-400">
                  Nenhum pagamento registrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: "good" | "warn" }) {
  const color = tone === "good" ? "text-emerald-600" : tone === "warn" ? "text-amber-600" : "";
  return (
    <Card className="p-5">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div className={`mt-2 text-lg font-bold tabular-nums ${color}`}>{value}</div>
    </Card>
  );
}
