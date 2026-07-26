import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, XCircle, CheckCircle2, PackageCheck } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getPurchaseOrderDetail, nextPoStatus } from "@/lib/data/purchase-orders";
import { setPoStatusAction, receivePoAction } from "../actions";
import { Card, Badge, Button } from "@/components/ui";
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

export default async function CompraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getPurchaseOrderDetail(session.tenantId, id);
  if (!data) notFound();
  const { order: o, items } = data;
  const iso = o.currencyIso ?? "BRL";
  const next = nextPoStatus(o.status);
  const isFinal = o.status === "recebido" || o.status === "cancelado";
  const canReceive = ["confirmado", "em_producao", "embarcado"].includes(o.status);

  return (
    <div>
      <Link
        href="/compras"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Pedidos de Compra
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{o.poNumber}</h1>
          <p className="text-sm text-neutral-500">
            {o.supplierName}
            {o.licenseeName ? ` · para ${o.licenseeName}` : ""}
          </p>
        </div>
        <Badge tone={poTone[o.status]}>{poLabel[o.status]}</Badge>
      </div>

      {!isFinal && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Avance o pedido pelo fluxo de suprimentos ou cancele-o.
          </p>
          <div className="flex flex-wrap gap-2">
            {next && (
              <form action={setPoStatusAction.bind(null, o.id, next)}>
                <Button type="submit">
                  {next === "recebido" ? <CheckCircle2 size={15} /> : <ArrowRight size={15} />}
                  Avançar para {poLabel[next]}
                </Button>
              </form>
            )}
            <form action={setPoStatusAction.bind(null, o.id, "cancelado")}>
              <Button type="submit" variant="outline">
                <XCircle size={15} /> Cancelar pedido
              </Button>
            </form>
          </div>
        </Card>
      )}
      {o.status === "recebido" && (
        <Card className="mb-4 flex items-start gap-3 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-800 dark:text-emerald-300">
            Pedido recebido{o.receivedDate ? ` em ${fmtDate(o.receivedDate)}` : ""}. Fluxo concluído.
          </p>
        </Card>
      )}

      {canReceive && (
        <Card className="mb-4 p-5">
          <h2 className="mb-1 text-sm font-semibold">Conferência de recebimento</h2>
          <p className="mb-3 text-xs text-neutral-500">
            Informe a quantidade recebida por item. Quando todos os itens forem recebidos por
            completo, o pedido é marcado como Recebido.
          </p>
          <form action={receivePoAction.bind(null, o.id)}>
            <div className="space-y-2">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between gap-3 border-b border-neutral-100 pb-2 last:border-0 dark:border-neutral-800"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{it.description}</div>
                    <div className="text-xs text-neutral-400">
                      Pedido: {Number(it.quantity).toLocaleString("pt-BR")} · Já recebido:{" "}
                      {Number(it.receivedQty).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <input
                    name={`qty_${it.id}`}
                    type="number"
                    min="0"
                    step="0.01"
                    max={Number(it.quantity)}
                    defaultValue={Number(it.receivedQty) > 0 ? Number(it.receivedQty) : Number(it.quantity)}
                    className="w-28 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-right text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3">
              <Button type="submit">
                <PackageCheck size={15} /> Registrar recebimento
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <Field label="Emissão" value={fmtDate(o.orderDate)} />
          <Field label="Previsão de entrega" value={fmtDate(o.expectedDate)} />
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
              <th className="px-5 py-2 font-medium">Descrição</th>
              <th className="px-5 py-2 text-right font-medium">Qtd.</th>
              <th className="px-5 py-2 text-right font-medium">Recebido</th>
              <th className="px-5 py-2 text-right font-medium">Preço unit.</th>
              <th className="px-5 py-2 text-right font-medium">Valor</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="px-5 py-2">
                  <div className="font-medium">{it.description}</div>
                  <div className="text-xs text-neutral-400">{it.sku ?? "—"}</div>
                </td>
                <td className="px-5 py-2 text-right tabular-nums">
                  {Number(it.quantity).toLocaleString("pt-BR")}
                </td>
                <td className="px-5 py-2 text-right tabular-nums">
                  {Number(it.receivedQty) >= Number(it.quantity) - 0.001 && Number(it.quantity) > 0 ? (
                    <span className="text-emerald-600">{Number(it.receivedQty).toLocaleString("pt-BR")}</span>
                  ) : (
                    <span className={Number(it.receivedQty) > 0 ? "text-amber-600" : "text-neutral-400"}>
                      {Number(it.receivedQty).toLocaleString("pt-BR")}
                    </span>
                  )}
                </td>
                <td className="px-5 py-2 text-right tabular-nums">{fmtMoney(it.unitPrice, iso)}</td>
                <td className="px-5 py-2 text-right font-medium tabular-nums">
                  {fmtMoney(it.amount, iso)}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-neutral-400">
                  Sem itens neste pedido.
                </td>
              </tr>
            )}
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
