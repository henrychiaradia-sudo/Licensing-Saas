import Link from "next/link";
import { Plus, Wallet, TrendingUp, PiggyBank, Layers } from "lucide-react";
import { requireSession } from "@/lib/auth";
import {
  listPurchaseCategories,
  categoriesSummary,
  spendByCategory,
  spendByNature,
} from "@/lib/data/purchase-categories";
import { Card, StatCard, Badge, Button } from "@/components/ui";
import { BarList, Donut, ProgressBar } from "@/components/charts";
import { fmtBRL, fmtCompactBRL, fmtPct } from "@/lib/utils";
import { natureLabel, natureTone, NATURE_OPTIONS } from "./labels";
import type { SpendNature } from "@/lib/db/schema";

export default async function PurchaseCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; nature?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireSession();
  const nature = (NATURE_OPTIONS.find((o) => o.value === sp.nature)?.value ?? undefined) as
    | SpendNature
    | undefined;
  const [rows, summary, byCategory, byNature] = await Promise.all([
    listPurchaseCategories(session.tenantId, { q: sp.q, nature }),
    categoriesSummary(session.tenantId),
    spendByCategory(session.tenantId),
    spendByNature(session.tenantId),
  ]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Categorias de Compras</h1>
          <p className="text-sm text-neutral-500">
            Category management — taxonomia de gasto, orçamento e classificação Capex/Opex/MRO.
          </p>
        </div>
        <Link href="/categorias-compras/nova">
          <Button>
            <Plus size={16} /> Nova categoria
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orçamento anual"
          value={fmtCompactBRL(summary.budget)}
          hint={`${summary.active} categoria(s) ativa(s)`}
          icon={<Wallet size={20} />}
          tone="blue"
        />
        <StatCard
          label="Gasto (realizado)"
          value={fmtCompactBRL(summary.spent)}
          hint={`${summary.usage}% do orçamento`}
          icon={<TrendingUp size={20} />}
          tone="blue"
        />
        <StatCard
          label="Saldo disponível"
          value={fmtCompactBRL(summary.available)}
          hint={summary.available < 0 ? "Acima do orçamento" : "Dentro do orçamento"}
          icon={<PiggyBank size={20} />}
          tone="blue"
        />
        <StatCard
          label="Categorias"
          value={String(summary.total)}
          hint="taxonomia de compras"
          icon={<Layers size={20} />}
          tone="blue"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Gasto por categoria (top 10)</h2>
          <BarList items={byCategory} format={fmtCompactBRL} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold">Gasto por natureza</h2>
          <p className="mb-4 text-xs text-neutral-500">Classificação Capex × Opex × MRO.</p>
          <Donut items={byNature} format={fmtCompactBRL} centerLabel="total" />
        </Card>
      </div>

      <form className="mb-4 mt-6 flex flex-wrap gap-2" action="/categorias-compras">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Buscar categoria…"
          className="h-9 w-60 rounded-lg border border-neutral-200 px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
        />
        <select
          name="nature"
          defaultValue={sp.nature ?? ""}
          className="h-9 rounded-lg border border-neutral-200 px-3 text-sm outline-none dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="">Todas as naturezas</option>
          {NATURE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Filtrar
        </Button>
      </form>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                <th scope="col" className="px-4 py-2.5 font-medium">Categoria</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Natureza</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Responsável</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Orçado</th>
                <th scope="col" className="px-4 py-2.5 text-right font-medium">Realizado</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Execução</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const budget = Number(c.annualBudget);
                const spent = Number(c.spent);
                const usage = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                return (
                  <tr
                    key={c.id}
                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40"
                  >
                    <td className="px-4 py-2.5 font-medium">
                      <Link href={`/categorias-compras/${c.id}`} className="hover:text-blue-600">
                        {c.name}
                      </Link>
                      <div className="text-[11px] text-neutral-400">
                        {c.code} · {Number(c.poCount)} pedido(s) · {Number(c.supplierCount)} fornecedor(es)
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={natureTone[c.nature as SpendNature]}>
                        {natureLabel[c.nature as SpendNature]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-neutral-500">{c.ownerName ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtBRL(budget)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{fmtBRL(spent)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <ProgressBar pct={usage} className="w-24" />
                        <span
                          className={`w-10 text-right text-xs tabular-nums ${usage > 100 ? "text-red-600" : "text-neutral-500"}`}
                        >
                          {fmtPct(usage)}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-neutral-400">
                    Nenhuma categoria encontrada.
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
