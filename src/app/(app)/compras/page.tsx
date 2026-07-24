import Link from "next/link";
import { ShoppingCart, PackageCheck, Clock } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listPurchaseOrders, purchaseSummary } from "@/lib/data/purchase-orders";
import { Card, Badge } from "@/components/ui";
import { fmtMoney, fmtDate, fmtCompactBRL } from "@/lib/utils";
import type { PoStatus } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

const poTone: Record<PoStatus, Tone> = {
  rascunho: "neutral",
  enviado: "info",
  confirmado: "info",
  em_producao: "warn",
  embarcado: "warn",
  recebido: "good",
  cancelado: "danger",
};
const poLabel: Record<PoStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  confirmado: "Confirmado",
  em_producao: "Em produção",
  embarcado: "Embarcado",
  recebido: "Recebido",
  cancelado: "Cancelado",
};

export default async function ComprasPage() {
  const session = await requireSession();
  const [orders, summary] = await Promise.all([
    listPurchaseOrders(session.tenantId),
    purchaseSummary(session.tenantId),
  ]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Pedidos de Compra</h1>
        <p className="text-sm text-neutral-500">
          Sourcing de produção e suprimentos — status, prazos e valores
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Kpi label="Comprometido" value={fmtCompactBRL(summary.committed)} icon={<ShoppingCart size={18} className="text-blue-600" />} />
        <Kpi label="Em aberto" value={fmtCompactBRL(summary.open)} icon={<Clock size={18} className="text-amber-500" />} />
        <Kpi label="Recebido" value={fmtCompactBRL(summary.received)} icon={<PackageCheck size={18} className="text-emerald-600" />} />
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-3 font-medium">Pedido</th>
              <th className="px-5 py-3 font-medium">Fornecedor</th>
              <th className="px-5 py-3 font-medium">Licenciado</th>
              <th className="px-5 py-3 font-medium">Previsão</th>
              <th className="px-5 py-3 text-right font-medium">Valor</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
              >
                <td className="px-5 py-3">
                  <Link href={`/compras/${o.id}`} className="font-semibold text-blue-600 hover:underline">
                    {o.poNumber}
                  </Link>
                  <div className="text-xs text-neutral-400">{fmtDate(o.orderDate)}</div>
                </td>
                <td className="px-5 py-3">{o.supplierName ?? "—"}</td>
                <td className="px-5 py-3">{o.licenseeName ?? "—"}</td>
                <td className="px-5 py-3 tabular-nums">{fmtDate(o.expectedDate)}</td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {fmtMoney(o.totalAmount, o.currencyIso ?? "BRL")}
                </td>
                <td className="px-5 py-3">
                  <Badge tone={poTone[o.status]}>{poLabel[o.status]}</Badge>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nenhum pedido de compra.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}
