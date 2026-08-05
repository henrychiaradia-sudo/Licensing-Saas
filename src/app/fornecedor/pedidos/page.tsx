import Link from "next/link";
import { requireSupplierSession } from "@/lib/auth";
import { listSupplierPos } from "@/lib/data/supplier-portal";
import { Card, Badge } from "@/components/ui";
import { fmtMoney, fmtDate } from "@/lib/utils";
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

export default async function SupplierPosPage() {
  const session = await requireSupplierSession();
  const pos = await listSupplierPos(session.tenantId, session.supplierId);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Meus Pedidos</h1>
        <p className="text-sm text-neutral-500">Pedidos de compra emitidos para você</p>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th scope="col" className="px-5 py-3 font-medium">Pedido</th>
              <th scope="col" className="px-5 py-3 font-medium">Data</th>
              <th scope="col" className="px-5 py-3 font-medium">Previsão</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Valor</th>
              <th scope="col" className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {pos.map((o) => (
              <tr
                key={o.id}
                className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
              >
                <td className="px-5 py-3">
                  <Link href={`/fornecedor/pedidos/${o.id}`} className="font-semibold text-indigo-600 hover:underline">
                    {o.poNumber}
                  </Link>
                </td>
                <td className="px-5 py-3 tabular-nums text-neutral-500">{fmtDate(o.orderDate)}</td>
                <td className="px-5 py-3 tabular-nums text-neutral-500">{fmtDate(o.expectedDate)}</td>
                <td className="px-5 py-3 text-right tabular-nums">{fmtMoney(o.totalAmount, o.currencyIso ?? "BRL")}</td>
                <td className="px-5 py-3">
                  <Badge tone={poTone[o.status]}>{poLabel[o.status]}</Badge>
                </td>
              </tr>
            ))}
            {pos.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-neutral-400">
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

export const dynamic = "force-dynamic";
