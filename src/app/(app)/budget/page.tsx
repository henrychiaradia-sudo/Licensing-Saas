import { Wallet, TrendingDown, PiggyBank, AlertTriangle } from "lucide-react";
import { requireSession } from "@/lib/auth";
import {
  listBudgets,
  budgetKpis,
  listBudgetCategoryOptions,
  CURRENT_FISCAL_YEAR,
} from "@/lib/data/purchase-budget";
import { Card, Badge, StatCard } from "@/components/ui";
import { Donut, ProgressBar } from "@/components/charts";
import { fmtBRL, fmtCompactBRL, cn } from "@/lib/utils";
import { BudgetForm } from "./budget-form";

const NATURE_LABEL: Record<string, string> = { capex: "Capex", opex: "Opex", mro: "MRO" };

export default async function BudgetPage() {
  const session = await requireSession();
  const year = CURRENT_FISCAL_YEAR;
  const [rows, kpis, cats] = await Promise.all([
    listBudgets(session.tenantId, year),
    budgetKpis(session.tenantId, year),
    listBudgetCategoryOptions(session.tenantId),
  ]);

  const donutItems = rows
    .filter((r) => r.consumed > 0)
    .slice(0, 8)
    .map((r) => ({ key: r.categoryId, label: r.name, value: r.consumed }));

  return (
    <div>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Wallet size={20} className="text-blue-600" /> Budget de Compras
        </h1>
        <p className="text-sm text-neutral-500">
          Orçamento por categoria e consumo (comprometido + realizado) — ano fiscal {year}
        </p>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orçado total"
          value={fmtCompactBRL(kpis.totalBudget)}
          hint={`${kpis.withBudget} categoria(s) com orçamento`}
          icon={<PiggyBank size={20} />}
          tone="blue"
        />
        <StatCard
          label="Consumido"
          value={fmtCompactBRL(kpis.totalConsumed)}
          hint={`${kpis.utilizationPct}% do orçado`}
          icon={<TrendingDown size={20} />}
          tone="violet"
        />
        <StatCard
          label="Disponível"
          value={fmtCompactBRL(kpis.totalAvailable)}
          hint="Orçado − consumido"
          icon={<Wallet size={20} />}
          tone={kpis.totalAvailable >= 0 ? "emerald" : "red"}
        />
        <StatCard
          label="Acima do orçamento"
          value={String(kpis.overCount)}
          hint="Categorias estouradas"
          icon={<AlertTriangle size={20} />}
          tone={kpis.overCount > 0 ? "amber" : "neutral"}
        />
      </div>

      <Card className="mb-5 p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Orçamento por categoria</h2>
          <p className="text-xs text-neutral-500">
            Comprometido = pedidos em aberto · Realizado = pedidos recebidos · Consumido = soma dos
            dois.
          </p>
        </div>
        <div className="grid gap-6 p-5 pt-2 lg:grid-cols-[1.8fr_1fr] lg:items-start">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th scope="col" className="py-2 pr-3 font-medium">Categoria</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Orçado</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Comprometido</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Realizado</th>
                  <th scope="col" className="py-2 pr-3 text-right font-medium">Disponível</th>
                  <th scope="col" className="py-2 pl-3 font-medium">Utilização</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.categoryId} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="py-2.5 pr-3">
                      <div className="font-medium">{r.name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-neutral-400">
                        <span>{r.code}</span>
                        <Badge tone="neutral" className="px-1.5 py-0 text-[10px]">
                          {NATURE_LABEL[r.nature] ?? r.nature}
                        </Badge>
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{fmtBRL(r.budget)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-amber-600">
                      {r.committed > 0 ? fmtBRL(r.committed) : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-blue-600">
                      {r.realized > 0 ? fmtBRL(r.realized) : "—"}
                    </td>
                    <td
                      className={cn(
                        "py-2.5 pr-3 text-right font-medium tabular-nums",
                        r.available < 0 ? "text-red-600" : "text-emerald-600",
                      )}
                    >
                      {fmtBRL(r.available)}
                    </td>
                    <td className="py-2.5 pl-3">
                      {r.budget > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-24">
                            <ProgressBar pct={r.utilizationPct} />
                          </div>
                          <span
                            className={cn(
                              "text-xs font-medium tabular-nums",
                              r.over ? "text-red-600" : "text-neutral-500",
                            )}
                          >
                            {r.utilizationPct}%
                          </span>
                          {r.over && (
                            <Badge tone="danger" className="px-1.5 py-0 text-[10px]">
                              estourou
                            </Badge>
                          )}
                        </div>
                      ) : r.consumed > 0 ? (
                        <Badge tone="warn" className="text-[10px]">
                          sem orçamento
                        </Badge>
                      ) : (
                        <span className="text-xs text-neutral-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-neutral-400">
                      Nenhuma categoria de compras cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t border-neutral-200 text-sm font-semibold dark:border-neutral-800">
                  <td className="py-2.5 pr-3">Total</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{fmtBRL(kpis.totalBudget)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-amber-600">{fmtBRL(kpis.totalCommitted)}</td>
                  <td className="py-2.5 pr-3 text-right tabular-nums text-blue-600">{fmtBRL(kpis.totalRealized)}</td>
                  <td className={cn("py-2.5 pr-3 text-right tabular-nums", kpis.totalAvailable < 0 ? "text-red-600" : "text-emerald-600")}>
                    {fmtBRL(kpis.totalAvailable)}
                  </td>
                  <td className="py-2.5 pl-3 text-xs text-neutral-500">{kpis.utilizationPct}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold text-neutral-500">Consumo por categoria</h3>
            <Donut
              items={donutItems}
              format={(n) => fmtBRL(n)}
              centerValue={fmtCompactBRL(kpis.totalConsumed)}
              centerLabel="Consumido"
            />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 text-sm font-semibold">Definir orçamento</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Defina ou ajuste o orçamento anual de uma categoria (ano fiscal {year}).
        </p>
        <BudgetForm
          categories={cats.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` }))}
          fiscalYear={year}
        />
      </Card>
    </div>
  );
}
