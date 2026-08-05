import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSupplierSession } from "@/lib/auth";
import { getSupplierPoDetail } from "@/lib/data/supplier-portal";
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

export default async function SupplierPoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSupplierSession();
  const data = await getSupplierPoDetail(session.tenantId, session.supplierId, id);
  if (!data) notFound();
  const { order: o, items } = data;
  const iso = o.currencyIso ?? "BRL";

  return (
    <div>
      <Link
        href="/fornecedor/pedidos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-indigo-600"
      >
        <ArrowLeft size={15} /> Meus Pedidos
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{o.poNumber}</h1>
        <Badge tone={poTone[o.status]}>{poLabel[o.status]}</Badge>
      </div>

      <Card className="p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <Field label="Data do pedido" value={fmtDate(o.orderDate)} />
          <Field label="Previsão" value={fmtDate(o.expectedDate)} />
          <Field label="Recebido em" value={fmtDate(o.receivedDate)} />
          <Field label="Incoterm" value={o.incoterm} />
        </dl>
        {o.notes && (
          <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-500 dark:border-neutral-800">
            {o.notes}
          </p>
        )}
      </Card>

      <Card className="mt-4 overflow-x-auto p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Itens</h2>
        </div>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th scope="col" className="px-5 py-2 font-medium">Descrição</th>
              <th scope="col" className="px-5 py-2 text-right font-medium">Qtd.</th>
              <th scope="col" className="px-5 py-2 text-right font-medium">Recebido</th>
              <th scope="col" className="px-5 py-2 text-right font-medium">Preço</th>
              <th scope="col" className="px-5 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="px-5 py-2">
                  <div className="font-medium">{it.description}</div>
                  <div className="text-xs text-neutral-400">{it.sku ?? "—"}</div>
                </td>
                <td className="px-5 py-2 text-right tabular-nums">{Number(it.quantity).toLocaleString("pt-BR")}</td>
                <td className="px-5 py-2 text-right tabular-nums">{Number(it.receivedQty).toLocaleString("pt-BR")}</td>
                <td className="px-5 py-2 text-right tabular-nums">{fmtMoney(Number(it.unitPrice), iso)}</td>
                <td className="px-5 py-2 text-right font-medium tabular-nums">
                  {fmtMoney(Number(it.quantity) * Number(it.unitPrice), iso)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200 dark:border-neutral-800">
              <td colSpan={4} className="px-5 py-3 text-right text-sm font-semibold">
                Total do pedido
              </td>
              <td className="px-5 py-3 text-right text-sm font-bold tabular-nums">
                {fmtMoney(o.totalAmount, iso)}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="font-medium">{value ?? "—"}</dd>
    </div>
  );
}

export const dynamic = "force-dynamic";
