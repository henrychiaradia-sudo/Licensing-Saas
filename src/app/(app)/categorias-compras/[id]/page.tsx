import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, ShoppingCart, Wallet } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getPurchaseCategoryDetail } from "@/lib/data/purchase-categories";
import { Card, Badge, Button } from "@/components/ui";
import { ProgressBar } from "@/components/charts";
import { fmtBRL, fmtDate, fmtPct } from "@/lib/utils";
import { natureLabel, natureTone, natureHint, statusLabel } from "../labels";
import type { SpendNature, PoStatus, PurchaseCategoryStatus } from "@/lib/db/schema";

const poStatusLabel: Record<PoStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  confirmado: "Confirmado",
  em_producao: "Em produção",
  embarcado: "Embarcado",
  recebido: "Recebido",
  cancelado: "Cancelado",
};
const poStatusTone: Record<PoStatus, "good" | "info" | "neutral" | "warn" | "danger"> = {
  rascunho: "neutral",
  enviado: "info",
  confirmado: "info",
  em_producao: "warn",
  embarcado: "warn",
  recebido: "good",
  cancelado: "danger",
};

export default async function PurchaseCategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getPurchaseCategoryDetail(session.tenantId, id);
  if (!data) notFound();
  const { category: c, pos, rollup } = data;
  const nature = c.nature as SpendNature;

  return (
    <div>
      <Link
        href="/categorias-compras"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Categorias de Compras
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{c.name}</h1>
          <p className="flex items-center gap-2 text-sm text-neutral-500">
            {c.code}
            <Badge tone={natureTone[nature]}>{natureLabel[nature]}</Badge>
            <span className="text-neutral-400">{statusLabel[c.status as PurchaseCategoryStatus]}</span>
          </p>
        </div>
        <Link href={`/categorias-compras/${c.id}/editar`}>
          <Button size="sm" variant="outline">
            <Pencil size={14} /> Editar
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Orçamento anual" value={fmtBRL(rollup.budget)} icon={<Wallet size={18} />} />
        <Metric label="Realizado" value={fmtBRL(rollup.spent)} hint={`${rollup.usage}% do orçamento`} />
        <Metric
          label="Saldo"
          value={fmtBRL(rollup.available)}
          tone={rollup.available < 0 ? "danger" : undefined}
        />
        <Metric label="Pedidos" value={String(rollup.poCount)} hint={`${rollup.supplierCount} fornecedor(es)`} icon={<ShoppingCart size={18} />} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Estratégia da categoria</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Field label="Responsável" value={c.ownerName} />
            <Field label="Natureza" value={`${natureLabel[nature]} — ${natureHint[nature]}`} />
          </dl>
          {c.strategy ? (
            <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-300">
              {c.strategy}
            </p>
          ) : (
            <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-400 dark:border-neutral-800">
              Sem estratégia definida.
            </p>
          )}
          {c.notes && <p className="mt-3 text-xs text-neutral-500">{c.notes}</p>}
        </Card>
        <Card className="p-5">
          <div className="text-xs font-medium text-neutral-500">Execução do orçamento</div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{fmtBRL(rollup.spent)}</div>
          <div className="mt-0.5 text-xs text-neutral-400">de {fmtBRL(rollup.budget)}</div>
          <ProgressBar pct={rollup.usage} className="mt-3" />
          <div className="mt-2 text-xs text-neutral-500">{fmtPct(rollup.usage)} executado</div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <ShoppingCart size={15} className="text-neutral-400" /> Pedidos de compra da categoria
        </h2>
        <p className="mb-3 text-xs text-neutral-500">
          Vincule pedidos a esta categoria em Pedidos de Compra para consolidar o gasto.
        </p>
        {pos.length === 0 ? (
          <p className="py-2 text-sm text-neutral-400">Nenhum pedido vinculado a esta categoria.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th scope="col" className="px-3 py-2 font-medium">Pedido</th>
                  <th scope="col" className="px-3 py-2 font-medium">Fornecedor</th>
                  <th scope="col" className="px-3 py-2 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2 font-medium">Data</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="px-3 py-2 font-medium">
                      <Link href={`/compras/${p.id}`} className="hover:text-blue-600">
                        {p.poNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-neutral-500">{p.supplierName ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge tone={poStatusTone[p.status as PoStatus]}>
                        {poStatusLabel[p.status as PoStatus]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-neutral-500">{fmtDate(p.orderDate)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(Number(p.totalAmount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-neutral-500">{label}</div>
        {icon && <span className="text-neutral-300">{icon}</span>}
      </div>
      <div className={`mt-1.5 text-xl font-bold tabular-nums ${tone === "danger" ? "text-red-600" : ""}`}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-neutral-400">{hint}</div>}
    </Card>
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
