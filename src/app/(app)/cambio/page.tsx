import {
  Banknote,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Wallet,
  Coins,
  Activity,
  ArrowRightLeft,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listCurrencyRates, fxExposure, listHedges, currencyOptionsFrom } from "@/lib/data/fx";
import { Card, Badge, StatCard } from "@/components/ui";
import { Donut } from "@/components/charts";
import { fmtBRL, fmtCompactBRL, fmtDate, cn } from "@/lib/utils";
import { Sparkline } from "./sparkline";
import { Scenario } from "./scenario";
import { RateForm } from "./rate-form";
import { HedgeForm } from "./hedge-form";

function fmtRate(n: number | null) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

const INSTRUMENT_LABEL: Record<string, string> = {
  ndf: "NDF",
  forward: "Forward",
  swap: "Swap",
  opcao: "Opção",
};
const HEDGE_STATUS_TONE: Record<string, "good" | "neutral" | "warn"> = {
  ativo: "good",
  liquidado: "neutral",
  cancelado: "warn",
};
const PO_STATUS_LABEL: Record<string, string> = {
  enviado: "Enviado",
  confirmado: "Confirmado",
  em_producao: "Em produção",
  embarcado: "Embarcado",
};

export default async function CambioPage() {
  const session = await requireSession();
  const [rates, exposure, hedges] = await Promise.all([
    listCurrencyRates(session.tenantId),
    fxExposure(session.tenantId),
    listHedges(session.tenantId),
  ]);
  const foreign = rates.filter((r) => !r.isBase);
  const options = currencyOptionsFrom(rates);
  const { rows, openPos, totals } = exposure;

  const donutItems = rows.map((r) => ({ key: r.currencyId, label: r.isoCode, value: r.exposureBase }));

  return (
    <div>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <ArrowRightLeft size={20} className="text-blue-600" /> Gestão Cambial
        </h1>
        <p className="text-sm text-neutral-500">
          Taxas multimoeda, exposição de compromissos em aberto, hedge e cenários de choque — base
          BRL
        </p>
      </div>

      {/* KPIs */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Exposição total (aberto)"
          value={fmtCompactBRL(totals.exposureBase)}
          hint={`${totals.poCount} pedido(s) · ${totals.currencyCount} moeda(s)`}
          icon={<Wallet size={20} />}
          tone="blue"
        />
        <StatCard
          label="Coberto por hedge"
          value={fmtCompactBRL(totals.hedgedBase)}
          hint={`${totals.coveragePct}% de cobertura`}
          icon={<ShieldCheck size={20} />}
          tone="emerald"
        />
        <StatCard
          label="Exposição líquida"
          value={fmtCompactBRL(totals.netBase)}
          hint="Não coberta por hedge"
          icon={<Activity size={20} />}
          tone={totals.netBase > 0 ? "amber" : "emerald"}
        />
        <StatCard
          label="Contratos de hedge"
          value={String(totals.hedgeCount)}
          hint="Ativos"
          icon={<Coins size={20} />}
          tone="violet"
        />
      </div>

      {/* Taxas de câmbio */}
      <Card className="mb-5 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Banknote size={16} className="text-blue-500" /> Taxas de câmbio
        </h2>
        <p className="mb-3 text-xs text-neutral-500">
          Cotação atual (BRL por 1 unidade), variação vs. cotação anterior e evolução.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                <th className="py-2 pr-4 font-medium">Moeda</th>
                <th className="py-2 pr-4 text-right font-medium">Cotação (BRL)</th>
                <th className="py-2 pr-4 text-right font-medium">Variação</th>
                <th className="py-2 pr-4 font-medium">Evolução</th>
                <th className="py-2 text-right font-medium">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {foreign.map((c) => {
                const up = (c.changePct ?? 0) >= 0;
                return (
                  <tr key={c.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="py-2.5 pr-4">
                      <span className="font-semibold">{c.isoCode}</span>
                      <span className="ml-2 text-xs text-neutral-400">{c.name}</span>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-medium tabular-nums">{fmtRate(c.current)}</td>
                    <td className="py-2.5 pr-4 text-right">
                      {c.changePct == null ? (
                        <span className="text-neutral-300">—</span>
                      ) : (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
                            up ? "text-emerald-600" : "text-red-500",
                          )}
                        >
                          {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                          {up ? "+" : ""}
                          {c.changePct.toFixed(2).replace(".", ",")}%
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4">
                      <Sparkline
                        values={c.history.map((h) => h.rate)}
                        color={up ? "#10b981" : "#ef4444"}
                      />
                    </td>
                    <td className="py-2.5 text-right text-xs text-neutral-400">{fmtDate(c.rateDate)}</td>
                  </tr>
                );
              })}
              {foreign.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-neutral-400">
                    Nenhuma moeda estrangeira ativa.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-5 border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <h3 className="mb-2 text-xs font-semibold text-neutral-500">Registrar cotação</h3>
          <RateForm currencies={options} />
        </div>
      </Card>

      {/* Exposição por moeda */}
      <Card className="mb-5 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Wallet size={16} className="text-blue-500" /> Exposição por moeda
        </h2>
        <p className="mb-4 text-xs text-neutral-500">
          Compromissos de compra em aberto (pedidos enviados, confirmados, em produção ou
          embarcados), convertidos a BRL pela cotação atual.
        </p>
        {rows.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                    <th className="py-2 pr-3 font-medium">Moeda</th>
                    <th className="py-2 pr-3 text-right font-medium">Exposição (moeda)</th>
                    <th className="py-2 pr-3 text-right font-medium">Exposição (BRL)</th>
                    <th className="py-2 pr-3 text-right font-medium">Coberto</th>
                    <th className="py-2 pr-3 text-right font-medium">Líquido (BRL)</th>
                    <th className="py-2 text-right font-medium">Cobertura</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.currencyId} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                      <td className="py-2.5 pr-3">
                        <span className="font-semibold">{r.isoCode}</span>
                        <div className="text-[11px] text-neutral-400">{r.poCount} pedido(s)</div>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-neutral-500">
                        {r.exposureNative.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-medium tabular-nums">{fmtBRL(r.exposureBase)}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-600">
                        {r.hedgedBase > 0 ? fmtBRL(r.hedgedBase) : "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-amber-600">
                        {fmtBRL(r.netBase)}
                      </td>
                      <td className="py-2.5 text-right">
                        <Badge tone={r.coveragePct >= 80 ? "good" : r.coveragePct >= 40 ? "warn" : "danger"}>
                          {r.coveragePct}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-neutral-200 text-sm font-semibold dark:border-neutral-800">
                    <td className="py-2.5 pr-3">Total</td>
                    <td></td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{fmtBRL(totals.exposureBase)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-emerald-600">{fmtBRL(totals.hedgedBase)}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-amber-600">{fmtBRL(totals.netBase)}</td>
                    <td className="py-2.5 text-right">{totals.coveragePct}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div>
              <Donut
                items={donutItems}
                format={(n) => fmtBRL(n)}
                centerValue={fmtCompactBRL(totals.exposureBase)}
                centerLabel="Exposição"
              />
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-neutral-400">
            Sem exposição cambial em aberto (todos os pedidos abertos estão em BRL).
          </p>
        )}
      </Card>

      {/* Cenário de choque */}
      <Card className="mb-5 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Activity size={16} className="text-blue-500" /> Cenário de choque cambial
        </h2>
        <p className="mb-4 text-xs text-neutral-500">
          Simule uma variação nas moedas estrangeiras e veja o impacto na exposição líquida.
        </p>
        <Scenario
          rows={rows.map((r) => ({
            isoCode: r.isoCode,
            unhedgedNative: r.unhedgedNative,
            rate: r.rate,
            netBase: r.netBase,
          }))}
        />
      </Card>

      {/* Hedge */}
      <Card className="mb-5 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck size={16} className="text-emerald-500" /> Contratos de hedge
        </h2>
        <p className="mb-4 text-xs text-neutral-500">
          Proteções contratadas (NDF, forward, swap, opção) por moeda.
        </p>
        {hedges.length > 0 ? (
          <div className="mb-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th className="py-2 pr-3 font-medium">Contrato</th>
                  <th className="py-2 pr-3 font-medium">Moeda</th>
                  <th className="py-2 pr-3 font-medium">Instrumento</th>
                  <th className="py-2 pr-3 text-right font-medium">Notional</th>
                  <th className="py-2 pr-3 text-right font-medium">Taxa</th>
                  <th className="py-2 pr-3 text-right font-medium">Valor (BRL)</th>
                  <th className="py-2 pr-3 text-right font-medium">Vencimento</th>
                  <th className="py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {hedges.map((h) => (
                  <tr key={h.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="py-2.5 pr-3 font-medium">{h.contractNumber}</td>
                    <td className="py-2.5 pr-3">{h.isoCode}</td>
                    <td className="py-2.5 pr-3">
                      {INSTRUMENT_LABEL[h.instrument] ?? h.instrument}
                      <span className="ml-1 text-[11px] text-neutral-400">
                        {h.side === "compra" ? "compra" : "venda"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-neutral-500">
                      {h.notionalNum.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">{fmtRate(h.strikeNum)}</td>
                    <td className="py-2.5 pr-3 text-right font-medium tabular-nums">{fmtBRL(h.coveredBase)}</td>
                    <td className="py-2.5 pr-3 text-right text-xs text-neutral-500">{fmtDate(h.maturityDate)}</td>
                    <td className="py-2.5 text-right">
                      <Badge tone={HEDGE_STATUS_TONE[h.status] ?? "neutral"}>{h.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mb-5 py-4 text-center text-sm text-neutral-400">Nenhum hedge registrado.</p>
        )}
        <div className="border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <h3 className="mb-2 text-xs font-semibold text-neutral-500">Registrar hedge</h3>
          <HedgeForm currencies={options} />
        </div>
      </Card>

      {/* Pedidos em aberto */}
      {openPos.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Coins size={16} className="text-blue-500" /> Pedidos em aberto (equivalente em BRL)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th className="py-2 pr-3 font-medium">Pedido</th>
                  <th className="py-2 pr-3 font-medium">Fornecedor</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 text-right font-medium">Valor (moeda)</th>
                  <th className="py-2 text-right font-medium">Equivalente (BRL)</th>
                </tr>
              </thead>
              <tbody>
                {openPos.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="py-2.5 pr-3 font-medium">{p.poNumber}</td>
                    <td className="py-2.5 pr-3 text-neutral-600 dark:text-neutral-300">{p.supplierName ?? "—"}</td>
                    <td className="py-2.5 pr-3">
                      <Badge tone="info">{PO_STATUS_LABEL[p.status] ?? p.status}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      <span className="text-neutral-400">{p.isoCode}</span>{" "}
                      {p.amountNative.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-2.5 text-right font-medium tabular-nums">{fmtBRL(p.amountBase)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
