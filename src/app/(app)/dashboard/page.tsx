import Link from "next/link";
import {
  Wallet,
  Coins,
  ShoppingCart,
  PiggyBank,
  TrendingUp,
  Users,
  FileText,
  Target,
  Activity,
  Landmark,
  ShieldAlert,
  Microscope,
  Gauge,
  LineChart,
  PieChart,
  Layers,
  ArrowRight,
  Radio,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { countLicensees } from "@/lib/data/licensees";
import { countActiveContracts } from "@/lib/data/contracts";
import { countActiveSuppliers } from "@/lib/data/suppliers";
import { financeSummary, mgRealizedPercent } from "@/lib/data/finance";
import { sourcingSavings } from "@/lib/data/sourcing";
import { royaltiesByCompetencia, revenueByLicensee, purchasesBySupplier, receivablesByStatus } from "@/lib/data/bi";
import {
  financialTimeline,
  execTotals,
  pipelineByStage,
  qualityBreakdown,
  contractStatusMix,
  supplierRiskMix,
  receivablesAging,
  trendDelta,
} from "@/lib/data/analytics";
import { fmtCompactBRL, fmtMoney } from "@/lib/utils";
import {
  Panel,
  Kpi,
  AreaLineChart,
  DonutChart,
  HBars,
  RadialGauge,
  MiniStat,
  PAL,
  SERIES,
} from "@/components/charts-pro";

const CONSOLE_BG =
  "radial-gradient(1200px 520px at 12% -12%, rgba(59,130,246,0.20), transparent 60%)," +
  "radial-gradient(1100px 520px at 105% -5%, rgba(168,85,247,0.16), transparent 55%)," +
  "radial-gradient(900px 600px at 60% 120%, rgba(34,211,238,0.10), transparent 55%)," +
  "#0a0f1e";

const receivableStatusLabel: Record<string, string> = {
  previsto: "Previsto",
  emitido: "Emitido",
  parcial: "Parcial",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

export default async function DashboardPage() {
  const session = await requireSession();
  const [
    licensees,
    contracts,
    suppliers,
    fin,
    mgPct,
    savings,
    timeline,
    totals,
    pipeline,
    quality,
    ctrMix,
    risk,
    aging,
    recByStatus,
    revByLic,
    purBySup,
    royByComp,
  ] = await Promise.all([
    countLicensees(session.tenantId),
    countActiveContracts(session.tenantId),
    countActiveSuppliers(session.tenantId),
    financeSummary(session.tenantId),
    mgRealizedPercent(session.tenantId),
    sourcingSavings(session.tenantId),
    financialTimeline(session.tenantId),
    execTotals(session.tenantId),
    pipelineByStage(session.tenantId),
    qualityBreakdown(session.tenantId),
    contractStatusMix(session.tenantId),
    supplierRiskMix(session.tenantId),
    receivablesAging(session.tenantId),
    receivablesByStatus(session.tenantId),
    revenueByLicensee(session.tenantId),
    purchasesBySupplier(session.tenantId),
    royaltiesByCompetencia(session.tenantId),
  ]);

  const won = pipeline.find((p) => p.stage === "ganho")?.count ?? 0;
  const lost = pipeline.find((p) => p.stage === "perdido")?.count ?? 0;
  const conversion = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;
  const openStages = pipeline.filter((p) => p.stage !== "ganho" && p.stage !== "perdido");

  const recItems = recByStatus.map((r) => ({ label: receivableStatusLabel[r.label] ?? r.label, value: r.value }));
  const pipelineItems = openStages.map((p) => ({ label: `${p.label} · ${p.count}`, value: p.value }));
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="-m-6 min-h-[calc(100vh-53px)] p-4 text-slate-200 sm:p-5" style={{ background: CONSOLE_BG }}>
      {/* ---- Banner ---- */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.06] to-transparent px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">Ao vivo</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Centro de Controle Executivo</h1>
          <p className="text-[13px] text-slate-400">
            ALIANZA · NovaSport Global — visão 360° lida do Supabase · {today}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <MiniStat label="Licenciados ativos" value={String(licensees)} accent={PAL.blue} icon={<Users size={16} />} />
          <MiniStat label="Contratos vigentes" value={String(contracts)} accent={PAL.indigo} icon={<FileText size={16} />} />
          <MiniStat label="Fornecedores ativos" value={String(suppliers)} accent={PAL.cyan} icon={<Layers size={16} />} />
          <MiniStat label="MG realizado" value={`${mgPct}%`} accent={PAL.emerald} icon={<TrendingUp size={16} />} />
        </div>
      </div>

      {/* ---- Faixa de KPIs ---- */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Faturamento"
          value={fmtCompactBRL(totals.faturamento)}
          icon={<Wallet size={16} />}
          accent={PAL.cyan}
          delta={trendDelta(timeline.receita)}
          spark={timeline.receita}
        />
        <Kpi
          label="Royalties apurados"
          value={fmtCompactBRL(totals.royalties)}
          icon={<Coins size={16} />}
          accent={PAL.violet}
          delta={trendDelta(timeline.royalties)}
          spark={timeline.royalties}
        />
        <Kpi
          label="Compras comprometidas"
          value={fmtCompactBRL(totals.compras)}
          icon={<ShoppingCart size={16} />}
          accent={PAL.amber}
          delta={trendDelta(timeline.compras)}
          spark={timeline.compras}
        />
        <Kpi
          label="Pipeline ponderado"
          value={fmtCompactBRL(totals.pipelineWeighted)}
          icon={<Target size={16} />}
          accent={PAL.pink}
          sub={`${totals.pipelineOpen} oportunidade(s) em aberto`}
        />
        <Kpi
          label="Recebido"
          value={fmtCompactBRL(fin.received)}
          icon={<PiggyBank size={16} />}
          accent={PAL.emerald}
          sub={`A receber: ${fmtCompactBRL(fin.outstanding)}`}
        />
        <Kpi
          label="Em aberto"
          value={fmtCompactBRL(fin.outstanding)}
          icon={<Landmark size={16} />}
          accent={PAL.sky}
          sub={`Vencido: ${fmtCompactBRL(fin.overdue)}`}
        />
        <Kpi
          label="Savings de sourcing"
          value={fmtCompactBRL(savings.totalSavings)}
          icon={<PiggyBank size={16} />}
          accent={PAL.lime}
        />
        <Kpi
          label="Conversão do pipeline"
          value={`${conversion}%`}
          icon={<Activity size={16} />}
          accent={PAL.teal}
          sub={`${won} ganho(s) · ${lost} perdido(s)`}
        />
      </div>

      {/* ---- Linha principal: fluxo + recebíveis ---- */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Panel
          title="Fluxo financeiro — 12 meses"
          subtitle="Receita prevista · royalties apurados · compras"
          icon={<LineChart size={15} />}
          accent={PAL.cyan}
          className="lg:col-span-2"
        >
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
      </div>

      {/* ---- Comercial + medidores + contratos ---- */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Pipeline comercial por estágio" subtitle="Valor estimado em funil" icon={<Target size={15} />} accent={PAL.pink}>
          <HBars items={pipelineItems} format={(n) => fmtMoney(n)} />
        </Panel>
        <Panel title="Medidores executivos" icon={<Gauge size={15} />} accent={PAL.emerald}>
          <div className="flex items-center justify-around gap-2 py-2">
            <RadialGauge pct={mgPct} label="MG realizado" color={PAL.emerald} />
            <RadialGauge pct={conversion} label="Conversão" color={PAL.pink} />
          </div>
        </Panel>
        <Panel title="Contratos por status" icon={<FileText size={15} />} accent={PAL.indigo}>
          <DonutChart items={ctrMix} centerLabel="contratos" format={(n) => String(n)} />
        </Panel>
      </div>

      {/* ---- Top receitas / compras / qualidade ---- */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Top licenciados por receita" icon={<Wallet size={15} />} accent={PAL.cyan}>
          <HBars items={revByLic.slice(0, 6)} format={(n) => fmtMoney(n)} />
        </Panel>
        <Panel title="Compras por fornecedor" icon={<ShoppingCart size={15} />} accent={PAL.amber}>
          <HBars items={purBySup.slice(0, 6)} format={(n) => fmtMoney(n)} />
        </Panel>
        <Panel title="Qualidade — inspeções" subtitle={`${quality.openNc} NC(s) em aberto`} icon={<Microscope size={15} />} accent={PAL.teal}>
          {quality.inspections.length ? (
            <DonutChart items={quality.inspections} size={140} thickness={20} centerLabel="inspeções" format={(n) => String(n)} />
          ) : (
            <p className="py-8 text-center text-[13px] text-slate-500">Sem inspeções registradas.</p>
          )}
        </Panel>
      </div>

      {/* ---- Aging + risco + royalties ---- */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Aging de recebíveis" subtitle="Saldo em aberto por faixa" icon={<Landmark size={15} />} accent={PAL.sky}>
          <HBars items={aging} format={(n) => fmtMoney(n)} />
        </Panel>
        <Panel
          title="Risco de fornecedores"
          subtitle={`${risk.evaluated} avaliado(s) · score médio ${risk.avgScore}`}
          icon={<ShieldAlert size={15} />}
          accent={PAL.amber}
        >
          {risk.items.length ? (
            <HBars items={risk.items} format={(n) => `${n} forn.`} />
          ) : (
            <p className="py-8 text-center text-[13px] text-slate-500">Sem avaliações.</p>
          )}
        </Panel>
        <Panel title="Royalties por competência" icon={<Coins size={15} />} accent={PAL.violet}>
          <HBars items={royByComp.slice(-6).map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }))} format={(n) => fmtMoney(n)} />
        </Panel>
      </div>

      {/* ---- Rodapé / atalho ---- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3.5">
        <p className="flex items-center gap-2 text-[12.5px] text-slate-400">
          <Radio size={14} className="text-emerald-400" />
          Todos os indicadores são leituras reais do banco (Supabase) — atualizados a cada carregamento.
        </p>
        <Link
          href="/bi"
          className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-white/20"
        >
          Abrir BI &amp; Analytics <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
