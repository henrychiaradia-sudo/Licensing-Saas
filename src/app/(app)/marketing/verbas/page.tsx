import { requireSession } from "@/lib/auth";
import { listCampaigns, marketingSummary } from "@/lib/data/marketing";
import { plansSummary } from "@/lib/data/marketing-plans";
import {
  spendByType,
  spendByChannel,
  coopVsOwn,
  budgetVsRealized,
} from "@/lib/data/marketing-analytics";
import { Card, StatCard, Badge } from "@/components/ui";
import { BarList, Donut, GroupedBars, SplitBar } from "@/components/charts";
import { fmtBRL, fmtCompactBRL, fmtPct } from "@/lib/utils";
import { Wallet, TrendingUp, Handshake, PiggyBank } from "lucide-react";
import Link from "next/link";
import { MarketingNav } from "../nav";

export default async function VerbasPage() {
  const session = await requireSession();
  const [summary, plans, byType, byChannel, coop, budgetReal, campaigns] = await Promise.all([
    marketingSummary(session.tenantId),
    plansSummary(session.tenantId),
    spendByType(session.tenantId),
    spendByChannel(session.tenantId),
    coopVsOwn(session.tenantId),
    budgetVsRealized(session.tenantId),
    listCampaigns(session.tenantId),
  ]);

  const totalCoop = coop.own + coop.coop;
  const remaining = summary.budget - summary.spent;

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold">Verbas & orçamento</h1>
        <p className="text-sm text-neutral-500">
          Orçado × realizado, verba própria × cooperada e distribuição por tática e canal.
        </p>
      </div>

      <MarketingNav />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Verba de campanhas"
          value={fmtCompactBRL(summary.budget)}
          hint={`Planos: ${fmtCompactBRL(plans.budget)}`}
          icon={<Wallet size={20} />}
          tone="blue"
        />
        <StatCard
          label="Realizado"
          value={fmtCompactBRL(summary.spent)}
          hint={`${summary.usage}% do orçamento`}
          icon={<TrendingUp size={20} />}
          tone="blue"
        />
        <StatCard
          label="Saldo disponível"
          value={fmtCompactBRL(remaining)}
          hint={remaining < 0 ? "Estouro de orçamento" : "Dentro do orçamento"}
          icon={<PiggyBank size={20} />}
          tone="blue"
        />
        <StatCard
          label="Verba cooperada"
          value={totalCoop > 0 ? fmtPct(Math.round((coop.coop / totalCoop) * 100)) : "—"}
          hint={fmtCompactBRL(coop.coop)}
          icon={<Handshake size={20} />}
          tone="blue"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Orçado × Realizado por campanha</h2>
          <GroupedBars
            rows={budgetReal.map((r) => ({ label: r.name, a: r.budget, b: r.spent }))}
            format={fmtCompactBRL}
          />
        </Card>
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold">Verba própria × cooperada</h2>
          <p className="mb-4 text-xs text-neutral-500">Origem do investimento nas ações.</p>
          <SplitBar a={coop.own} b={coop.coop} aLabel="Própria" bLabel="Cooperada" format={fmtCompactBRL} />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="text-xs text-neutral-500">Própria</div>
              <div className="mt-1 text-lg font-bold tabular-nums">{fmtBRL(coop.own)}</div>
            </div>
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="text-xs text-neutral-500">Cooperada</div>
              <div className="mt-1 text-lg font-bold tabular-nums">{fmtBRL(coop.coop)}</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Investimento por tática</h2>
          <Donut items={byType} format={fmtCompactBRL} centerLabel="total" />
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Investimento por canal</h2>
          <BarList items={byChannel} format={fmtCompactBRL} />
        </Card>
      </div>

      <Card className="mt-4 p-0">
        <div className="border-b border-neutral-100 px-5 py-3 dark:border-neutral-800">
          <h2 className="text-sm font-semibold">Detalhamento por campanha</h2>
        </div>
        {campaigns.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-400">Sem campanhas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th scope="col" className="px-5 py-2.5 font-medium">Campanha</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Orçado</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Realizado</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Saldo</th>
                  <th scope="col" className="px-5 py-2.5 text-right font-medium">Execução</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const budget = Number(c.budget);
                  const spent = Number(c.spent);
                  const bal = budget - spent;
                  const usage = budget > 0 ? Math.round((spent / budget) * 100) : 0;
                  return (
                    <tr key={c.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                      <td className="px-5 py-2.5 font-medium">
                        <Link href={`/marketing/campanhas/${c.id}`} className="hover:text-blue-600">
                          {c.name}
                        </Link>
                        {c.coop && (
                          <span className="ml-2 text-[10px] font-semibold uppercase text-emerald-600">coop</span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{fmtBRL(budget)}</td>
                      <td className="px-5 py-2.5 text-right tabular-nums">{fmtBRL(spent)}</td>
                      <td className={`px-5 py-2.5 text-right tabular-nums ${bal < 0 ? "text-red-600" : ""}`}>
                        {fmtBRL(bal)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <Badge tone={usage > 100 ? "danger" : usage >= 80 ? "warn" : "good"}>{usage}%</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
