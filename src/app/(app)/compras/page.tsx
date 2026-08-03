import Link from "next/link";
import { ShoppingCart, PackageCheck, Clock, Plus } from "lucide-react";
import { requireSession } from "@/lib/auth";
import {
  listPurchaseOrders,
  purchaseSummary,
  purchaseSpendAnalysis,
  listSupplierOptions,
} from "@/lib/data/purchase-orders";
import { Card, Badge, Button } from "@/components/ui";
import { ExportCsvButton } from "@/components/export-csv-button";
import { fmtMoney, fmtDate, fmtCompactBRL } from "@/lib/utils";
import type { PoStatus, SupplierCategory } from "@/lib/db/schema";

const categoryLabel: Record<SupplierCategory, string> = {
  materia_prima: "Matéria-prima",
  manufatura: "Manufatura",
  embalagem: "Embalagem",
  logistica: "Logística",
  servicos: "Serviços",
  marketing: "Marketing",
  tecnologia: "Tecnologia",
};

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

export default async function ComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string }>;
}) {
  const session = await requireSession();
  const { supplier: supplierParam } = await searchParams;
  const suppliers = await listSupplierOptions(session.tenantId);
  const supplierId =
    supplierParam && suppliers.some((s) => s.id === supplierParam) ? supplierParam : undefined;

  const [orders, summary, spend] = await Promise.all([
    listPurchaseOrders(session.tenantId, { supplierId }),
    purchaseSummary(session.tenantId),
    purchaseSpendAnalysis(session.tenantId),
  ]);
  const maxSupplierSpend = Math.max(1, ...spend.bySupplier.map((s) => s.total));
  const maxCategorySpend = Math.max(1, ...spend.byCategory.map((c) => c.total));

  const csvColumns = [
    { key: "pedido", label: "Pedido" },
    { key: "fornecedor", label: "Fornecedor" },
    { key: "licenciado", label: "Licenciado" },
    { key: "previsao", label: "Previsão" },
    { key: "valor", label: "Valor" },
    { key: "status", label: "Status" },
  ];
  const csvRows = orders.map((o) => ({
    pedido: o.poNumber,
    fornecedor: o.supplierName ?? "",
    licenciado: o.licenseeName ?? "",
    previsao: o.expectedDate ?? "",
    valor: Number(o.totalAmount),
    status: poLabel[o.status],
  }));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Pedidos de Compra</h1>
          <p className="text-sm text-neutral-500">
            Sourcing de produção e suprimentos — status, prazos e valores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton filename="pedidos-compra.csv" columns={csvColumns} rows={csvRows} />
          <Link href="/compras/new">
            <Button>
              <Plus size={16} /> Novo pedido
            </Button>
          </Link>
        </div>
      </div>

      <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px]">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Fornecedor</label>
          <select
            name="supplier"
            defaultValue={supplierId ?? ""}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Todos os fornecedores</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.tradeName || s.legalName}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {supplierId && (
          <Link href="/compras" className="text-sm text-neutral-500 hover:underline">
            Limpar
          </Link>
        )}
      </form>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Kpi label="Comprometido" value={fmtCompactBRL(summary.committed)} icon={<ShoppingCart size={18} className="text-blue-600" />} />
        <Kpi label="Em aberto" value={fmtCompactBRL(summary.open)} icon={<Clock size={18} className="text-amber-500" />} />
        <Kpi label="Recebido" value={fmtCompactBRL(summary.received)} icon={<PackageCheck size={18} className="text-emerald-600" />} />
      </div>

      {(spend.bySupplier.length > 0 || spend.byCategory.length > 0) && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Spend por fornecedor</h2>
            <div className="space-y-2.5">
              {spend.bySupplier.map((s) => (
                <div key={s.name}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="truncate text-neutral-600 dark:text-neutral-300">{s.name}</span>
                    <span className="font-medium tabular-nums">{fmtCompactBRL(s.total)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${(s.total / maxSupplierSpend) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {spend.bySupplier.length === 0 && (
                <p className="text-sm text-neutral-400">Sem gasto comprometido.</p>
              )}
            </div>
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold">Spend por categoria</h2>
            <div className="space-y-2.5">
              {spend.byCategory.map((c) => (
                <div key={c.category ?? "sem"}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-neutral-600 dark:text-neutral-300">
                      {c.category ? categoryLabel[c.category] : "Sem categoria"}
                    </span>
                    <span className="font-medium tabular-nums">{fmtCompactBRL(c.total)}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${(c.total / maxCategorySpend) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {spend.byCategory.length === 0 && (
                <p className="text-sm text-neutral-400">Sem gasto comprometido.</p>
              )}
            </div>
          </Card>
        </div>
      )}

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
