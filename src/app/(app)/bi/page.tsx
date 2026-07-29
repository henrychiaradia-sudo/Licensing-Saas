import {
  Coins,
  Wallet,
  ShoppingCart,
  PiggyBank,
  BarChart3,
  ScatterChart as ScatterIcon,
  LineChart,
  PieChart,
  Target,
  Microscope,
  ShieldAlert,
  Landmark,
  Gauge,
  FileText,
  TrendingUp,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import {
  royaltiesByCompetencia,
  revenueByLicensee,
  purchasesBySupplier,
  receivablesByStatus,
  type Slice,
} from "@/lib/data/bi";
import { financeSummary, mgRealizedPercent } from "@/lib/data/finance";
import { sourcingSavings } from "@/lib/data/sourcing";
import { listLatestEvaluations } from "@/lib/data/evaluations";
import {
  financialTimeline,
  execTotals,
  pipelineByStage,
  qualityBreakdown,
  supplierRiskMix,
  contractStatusMix,
  receivablesAging,
  salesRoyaltyScatter,
  royaltyStatusMix,
} from "@/lib/data/analytics";
import { fmtCompactBRL, fmtMoney } from "@/lib/utils";
import type { SupplierRiskLevel } from "@/lib/db/schema";
import {
  Panel,
  Kpi,
  AreaLineChart,
  DonutChart,
  HBars,
  RadialGauge,
  ScatterChart,
  DataTable,
  PAL,
  SERIES,
} from "@/components/charts-pro";

const CONSOLE_BG =
  "radial-gradient(1200px 520px at 10% -12%, rgba(168,85,247,0.18), transparent 60%)," +
  "radial-gradient(1100px 520px at 108% -5%, rgba(34,211,238,0.16), transparent 55%)," +
  "radial-gradient(900px 600px at 55% 120%, rgba(59,130,246,0.10), transparent 55%)," +
  "#0a0f1e";

const receivableStatusLabel: Record<string, string> = {
  previsto: "Previsto",
  emitido: "Emitido",
  parcial: "Parcial",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

const riskLabel: Record<SupplierRiskLevel, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  critico: "Crítico",
};
const riskColor: Record<SupplierRiskLevel, string> = {
  baixo: "text-emerald-300",
  medio: "text-amber-300",
  alto: "text-orange-300",
  critico: "text-red-300",
};

function Section({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="mb-3 mt-6 flex items-center gap-2 first:mt-0">
      <span className="text-cyan-300">{icon}</span>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-slate-300">{label}</h2>
      <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
    </div>
  );
}

export default async function BiPage() {
  const session = await requireSession();
  const [
    royalties,
    revenue,
    purchases,
    receivables,
    fin,
    mgPct,
    savings,
    evaluations,
    timeline,
    totals,
    pipeline,
    quality,
    risk,
    ctrMix,
    aging,
    scatter,
    royStatus,
  ] = await Promise.all([
    royaltiesByCompetencia(session.tenantId),
    revenueByLicensee(session.tenantId),
    purchasesBySupplier(session.tenantId),
    receivablesByStatus(session.tenantId),
    financeSummary(session.tenantId),
    mgRealizedPercent(session.tenantId),
    sourcingSavings(session.tenantId),
    listLatestEvaluations(session.tenantId),
    financialTimeline(session.tenantId),
    execTotals(session.tenantId),
    pipelineByStage(session.tenantId),
    qualityBreakdown(session.tenantId),
    supplierRiskMix(session.tenantId),
    contractStatusMix(session.tenantId),
    receivablesAging(session.tenantId),
    salesRoyaltyScatter(session.tenantId),
    royaltyStatusMix(session.tenantId),
  ]);

  const sum = (arr: Slice[]) => arr.reduce((a, b) => a + b.value, 0);
  const recItems = receivables.map((r) => ({ label: receivableStatusLabel[r.label] ?? r.label, value: r.value }));
  const openStages = pipeline.filter((p) => p.stage !== "ganho" && p.stage !== "perdido");
  const pipelineItems = openStages.map((p) => ({ label: `${p.label} · ${p.count}`, value: p.value }));
  const won = pipeline.find((p) => p.stage === "ganho")?.count ?? 0;
  const lost = pipeline.find((p) => p.stage === "perdido")?.count ?? 0;
  const conversion = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  const scatterPoints = scatter.map((p, i) => ({
    x: p.x,
    y: p.y,
    r: Math.min(11, 4 + p.reports),
    color: SERIES[i % SERIES.length],
    label: p.label,
  }));

  const topEvals = [...evaluations].sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0)).slice(0, 7);
  const evalRows = topEvals.map((e) => ({
    forn: e.supplierName ?? "—",
    periodo: e.periodLabel,
    score: <span className="font-semibold text-white">{e.overallScore}</span>,
    risco: <span className={riskColor[e.riskLevel]}>{riskLabel[e.riskLevel]}</span>,
  }));

  return (
    <div className="-m-6 min-h-[calc(100vh-53px)] p-4 text-slate-200 sm:p-5" style={{ background: CONSOLE_BG }}>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.06] to-transparent px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-violet-500/30 text-cyan-300">
            <BarChart3 size={22} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">BI &amp; Analytics</h1>
            <p className="text-[13px] text-slate-400">
              Suíte analítica consolidada — finanças, royalties, comercial, suprimentos e qualidade
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <RadialGauge pct={mgPct} label="MG realizado" color={PAL.emerald} size={92} />
          <RadialGauge pct={conversion} label="Conversão" color={PAL.pink} size={92} />
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Royalties acumulados" value={fmtCompactBRL(sum(royalties))} icon={<Coins size={16} />} accent={PAL.violet} />
        <Kpi label="Receita faturada" value={fmtCompactBRL(totals.faturamento)} icon={<Wallet size={16} />} accent={PAL.cyan} />
        <Kpi label="Compras comprometidas" value={fmtCompactBRL(totals.compras)} icon={<ShoppingCart size={16} />} accent={PAL.amber} />
        <Kpi label="Savings de sourcing" value={fmtCompactBRL(savings.totalSavings)} icon={<PiggyBank size={16} />} accent={PAL.emerald} />
      </div>

      {/* Financeiro & Royalties */}
      <Section label="Financeiro & Royalties" icon={<LineChart size={16} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Fluxo financeiro — 12 meses" subtitle="Receita · royalties · compras" icon={<LineChart size={15} />} accent={PAL.cyan} className="lg:col-span-2">
          <AreaLineChart
            labels={timeline.labels}
            height={230}
            format={(n) => fmtCompactBRL(n)}
            series={[
              { name: "Receita", color: PAL.cyan, data: timeline.receita },
              { name: "Royalties", color: PAL.violet, data: timeline.royalties },
              { name: "Compras", color: PAL.amber, data: timeline.compras },
            ]}
          />
        </Panel>
        <Panel title="Recebíveis por status" icon={<PieChart size={15} />} accent={PAL.emerald}>
          <DonutChart items={recItems} centerLabel="títulos" format={(n) => fmtCompactBRL(n)} />
        </Panel>

        <Panel title="Vendas brutas × Royalties" subtitle="Cada bolha = um reporte de royalties" icon={<ScatterIcon size={15} />} accent={PAL.pink} className="lg:col-span-2">
          <ScatterChart points={scatterPoints} xLabel="Vendas brutas" yLabel="Royalties ↑" format={(n) => fmtCompactBRL(n)} height={250} />
        </Panel>
        <Panel title="Royalties por status" icon={<Coins size={15} />} accent={PAL.violet}>
          <DonutChart items={royStatus} centerLabel="reportes" format={(n) => String(n)} />
        </Panel>

        <Panel title="Royalties por competência" icon={<Coins size={15} />} accent={PAL.violet}>
          <HBars items={royalties.slice(-7).map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }))} format={(n) => fmtMoney(n)} />
        </Panel>
        <Panel title="Receita por licenciado" icon={<Wallet size={15} />} accent={PAL.cyan}>
          <HBars items={revenue.slice(0, 7)} format={(n) => fmtMoney(n)} />
        </Panel>
        <Panel title="Aging de recebíveis" subtitle="Saldo em aberto por faixa" icon={<Landmark size={15} />} accent={PAL.sky}>
          <HBars items={aging} format={(n) => fmtMoney(n)} />
        </Panel>
      </div>

      {/* Comercial */}
      <Section label="Comercial — Pipeline" icon={<Target size={16} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Pipeline por estágio" subtitle="Valor estimado no funil" icon={<Target size={15} />} accent={PAL.pink} className="lg:col-span-2">
          <HBars items={pipelineItems} format={(n) => fmtMoney(n)} />
        </Panel>
        <Panel title="Conversão comercial" icon={<Gauge size={15} />} accent={PAL.teal}>
          <div className="flex flex-col items-center gap-2 py-2">
            <RadialGauge pct={conversion} label="ganhos / decididos" color={PAL.pink} size={150} />
            <p className="text-[12px] text-slate-400">
              <span className="font-semibold text-emerald-300">{won}</span> ganhos ·{" "}
              <span className="font-semibold text-red-300">{lost}</span> perdidos
            </p>
          </div>
        </Panel>
      </div>

      {/* Suprimentos */}
      <Section label="Suprimentos" icon={<ShoppingCart size={16} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Compras por fornecedor" icon={<ShoppingCart size={15} />} accent={PAL.amber} className="lg:col-span-2">
          <HBars items={purchases.slice(0, 8)} format={(n) => fmtMoney(n)} />
        </Panel>
        <Panel title="Risco de fornecedores" subtitle={`score médio ${risk.avgScore}`} icon={<ShieldAlert size={15} />} accent={PAL.orange}>
          {risk.items.length ? (
            <DonutChart items={risk.items} size={140} thickness={20} centerLabel="avaliados" format={(n) => String(n)} />
          ) : (
            <p className="py-8 text-center text-[13px] text-slate-500">Sem avaliações.</p>
          )}
        </Panel>
      </div>

      {/* Qualidade & Compliance */}
      <Section label="Qualidade & Governança" icon={<Microscope size={16} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Inspeções de qualidade" subtitle={`${quality.openNc} NC(s) em aberto`} icon={<Microscope size={15} />} accent={PAL.teal}>
          {quality.inspections.length ? (
            <DonutChart items={quality.inspections} size={140} thickness={20} centerLabel="inspeções" format={(n) => String(n)} />
          ) : (
            <p className="py-8 text-center text-[13px] text-slate-500">Sem inspeções.</p>
          )}
        </Panel>
        <Panel title="Não conformidades por severidade" icon={<ShieldAlert size={15} />} accent={PAL.red}>
          {quality.ncBySeverity.length ? (
            <HBars items={quality.ncBySeverity} format={(n) => `${n} NC`} />
          ) : (
            <p className="py-8 text-center text-[13px] text-slate-500">Sem não conformidades.</p>
          )}
        </Panel>
        <Panel title="Contratos por status" icon={<FileText size={15} />} accent={PAL.indigo}>
          <DonutChart items={ctrMix} size={140} thickness={20} centerLabel="contratos" format={(n) => String(n)} />
        </Panel>

        <Panel title="Scorecard de fornecedores" subtitle="Melhores avaliações" icon={<TrendingUp size={15} />} accent={PAL.emerald} className="lg:col-span-3">
          <DataTable
            columns={[
              { key: "forn", label: "Fornecedor" },
              { key: "periodo", label: "Período" },
              { key: "score", label: "Score", align: "right" },
              { key: "risco", label: "Risco", align: "right" },
            ]}
            rows={evalRows}
          />
        </Panel>
      </div>
    </div>
  );
}
