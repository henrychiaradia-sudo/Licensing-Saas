import Link from "next/link";
import { Plus, Calculator, Coins, Percent, Package } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listCostSheets, costSheetsSummary } from "@/lib/data/cost-sheets";
import { Card, StatCard, Badge, Button } from "@/components/ui";
import { fmtBRL, fmtPct } from "@/lib/utils";

export default async function CostSheetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireSession();
  const [rows, summary] = await Promise.all([
    listCostSheets(session.tenantId, { q: sp.q }),
    costSheetsSummary(session.tenantId),
  ]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Gestão de Custos</h1>
          <p className="text-sm text-neutral-500">
            Formação de custo e preço (cost breakdown): FOB → CIF → impostos → custo total → preço sugerido.
          </p>
        </div>
        <Link href="/custos/nova">
          <Button>
            <Plus size={16} /> Nova ficha
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Fichas de custo" value={String(summary.total)} icon={<Calculator size={20} />} tone="blue" />
        <StatCard label="Custo médio" value={fmtBRL(summary.avgCost)} icon={<Package size={20} />} tone="blue" />
        <StatCard label="Preço médio sugerido" value={fmtBRL(summary.avgPrice)} icon={<Coins size={20} />} tone="blue" />
        <StatCard label="Margem média" value={fmtPct(summary.avgMargin, 1)} icon={<Percent size={20} />} tone="blue" />
      </div>

      <form className="mb-4 mt-6 flex flex-wrap gap-2" action="/custos">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Buscar por nome, código ou SKU…"
          className="h-9 w-72 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <Button type="submit" variant="outline" size="sm">
          Filtrar
        </Button>
      </form>

      <Card className="p-0">
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-400">Nenhuma ficha de custo cadastrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th scope="col" className="px-4 py-2.5 font-medium">Ficha</th>
                  <th scope="col" className="px-4 py-2.5 font-medium">Produto</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">CIF</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Custo total</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Preço sugerido</th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">Margem</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40"
                  >
                    <td className="px-4 py-2.5 font-medium">
                      <Link href={`/custos/${r.id}`} className="hover:text-blue-600">
                        {r.name}
                      </Link>
                      <div className="text-[11px] text-neutral-400">
                        {r.code}
                        {r.sku ? ` · ${r.sku}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-500">{r.productName ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-neutral-500">{fmtBRL(r.result.cif)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtBRL(r.result.custoTotal)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmtBRL(r.result.precoSugerido)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Badge tone={r.result.margemPct >= 0 ? "good" : "danger"}>
                        {fmtPct(r.result.margemPct, 1)}
                      </Badge>
                    </td>
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
