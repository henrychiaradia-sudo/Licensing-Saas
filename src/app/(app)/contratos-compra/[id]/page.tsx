import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Wallet, ShoppingCart, Plus, Play, Pause, Square, Link2 } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getPurchaseContractDetail } from "@/lib/data/purchase-contracts";
import { setPurchaseContractStatusAction } from "../actions";
import { Card, Badge, Button } from "@/components/ui";
import { ProgressBar } from "@/components/charts";
import { fmtMoney, fmtDate, cn } from "@/lib/utils";
import { pcTone, pcLabel } from "../page";
import type { PoStatus } from "@/lib/db/schema";

const poLabel: Record<PoStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  confirmado: "Confirmado",
  em_producao: "Em produção",
  embarcado: "Embarcado",
  recebido: "Recebido",
  cancelado: "Cancelado",
};
const poTone: Record<PoStatus, "good" | "info" | "neutral" | "warn" | "danger"> = {
  rascunho: "neutral",
  enviado: "info",
  confirmado: "info",
  em_producao: "warn",
  embarcado: "warn",
  recebido: "good",
  cancelado: "danger",
};

export default async function ContratoCompraDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getPurchaseContractDetail(session.tenantId, id);
  if (!data) notFound();
  const { contract: c, pos, drawdown } = data;
  const iso = c.currency ?? "BRL";
  const over = drawdown.available < 0;

  return (
    <div>
      <Link
        href="/contratos-compra"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Contratos de Compra
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{c.contractNumber}</h1>
          <p className="text-sm text-neutral-500">
            {c.title} · {c.supplierName}
            {c.supplyContractNumber ? (
              <span className="ml-1 inline-flex items-center gap-1 text-xs text-neutral-400">
                <Link2 size={12} /> {c.supplyContractNumber}
              </span>
            ) : null}
          </p>
        </div>
        <Badge tone={pcTone[c.status]}>{pcLabel[c.status]}</Badge>
      </div>

      {/* Saldo do contrato */}
      <Card className="mb-4 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Wallet size={16} className="text-blue-500" /> Saldo do contrato
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-xs text-neutral-400">Comprometido</div>
            <div className="mt-1 text-lg font-bold tabular-nums">{fmtMoney(drawdown.committed, iso)}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-400">Consumido ({drawdown.poCount} pedido(s))</div>
            <div className="mt-1 text-lg font-bold tabular-nums text-amber-600">
              {fmtMoney(drawdown.consumed, iso)}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-400">Saldo disponível</div>
            <div className={cn("mt-1 text-lg font-bold tabular-nums", over ? "text-red-600" : "text-emerald-600")}>
              {fmtMoney(drawdown.available, iso)}
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex-1">
            <ProgressBar pct={drawdown.utilizationPct} />
          </div>
          <span className={cn("text-sm font-semibold tabular-nums", over ? "text-red-600" : "text-neutral-600")}>
            {drawdown.utilizationPct}%
          </span>
          {over && <Badge tone="danger">saldo estourado</Badge>}
        </div>
      </Card>

      {/* Ações de status */}
      {c.status !== "encerrado" && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Gerencie a vigência do contrato.
          </p>
          <div className="flex flex-wrap gap-2">
            {c.status !== "vigente" && (
              <form action={setPurchaseContractStatusAction.bind(null, c.id, "vigente")}>
                <Button type="submit" size="sm">
                  <Play size={14} /> Tornar vigente
                </Button>
              </form>
            )}
            {c.status === "vigente" && (
              <form action={setPurchaseContractStatusAction.bind(null, c.id, "suspenso")}>
                <Button type="submit" size="sm" variant="outline">
                  <Pause size={14} /> Suspender
                </Button>
              </form>
            )}
            <form action={setPurchaseContractStatusAction.bind(null, c.id, "encerrado")}>
              <Button type="submit" size="sm" variant="outline">
                <Square size={14} /> Encerrar
              </Button>
            </form>
          </div>
        </Card>
      )}

      <Card className="mb-4 p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
          <Field label="Fornecedor" value={`${c.supplierName ?? "—"}${c.supplierCode ? ` (${c.supplierCode})` : ""}`} />
          <Field label="Início" value={fmtDate(c.startDate)} />
          <Field label="Fim" value={fmtDate(c.endDate)} />
          <Field label="Pagamento" value={c.paymentTerms} />
        </dl>
        {c.notes && (
          <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-500 dark:border-neutral-800">
            {c.notes}
          </p>
        )}
      </Card>

      {/* Pedidos vinculados */}
      <Card className="p-0">
        <div className="flex items-center justify-between p-5 pb-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShoppingCart size={16} className="text-blue-500" /> Pedidos vinculados
          </h2>
          <Link href={`/compras/new?contrato=${c.id}`}>
            <Button variant="outline" size="sm">
              <Plus size={14} /> Novo pedido
            </Button>
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                <th className="px-5 py-2 font-medium">Pedido</th>
                <th className="px-5 py-2 font-medium">Emissão</th>
                <th className="px-5 py-2 text-right font-medium">Valor</th>
                <th className="px-5 py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pos.map((p) => (
                <tr key={p.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-5 py-2.5">
                    <Link href={`/compras/${p.id}`} className="font-medium text-blue-600 hover:underline">
                      {p.poNumber}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-neutral-500">{fmtDate(p.orderDate)}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">{fmtMoney(p.totalAmount, iso)}</td>
                  <td className="px-5 py-2.5 text-right">
                    <Badge tone={poTone[p.status as PoStatus]}>{poLabel[p.status as PoStatus]}</Badge>
                  </td>
                </tr>
              ))}
              {pos.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-neutral-400">
                    Nenhum pedido vinculado ainda. Crie um pedido e selecione este contrato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
