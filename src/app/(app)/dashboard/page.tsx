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
  Layers,
  Gauge,
  LineChart,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Radio,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { countLicensees } from "@/lib/data/licensees";
import { countActiveContracts } from "@/lib/data/contracts";
import { countActiveSuppliers } from "@/lib/data/suppliers";
import { financeSummary, mgRealizedPercent } from "@/lib/data/finance";
import { sourcingSavings } from "@/lib/data/sourcing";
import { financialTimeline, execTotals, pipelineByStage, attentionSignals, trendDelta } from "@/lib/data/analytics";
import { fmtCompactBRL } from "@/lib/utils";
import { ExportGroup } from "@/components/export-group";
import { Panel, Kpi, AreaLineChart, RadialGauge, MiniStat, AlertCard, PAL } from "@/components/charts-pro";

export default async function DashboardPage() {
  const session = await requireSession();
  const [licensees, contracts, suppliers, fin, mgPct, savings, timeline, totals, pipeline, attention] =
    await Promise.all([
      countLicensees(session.tenantId),
      countActiveContracts(session.tenantId),
      countActiveSuppliers(session.tenantId),
      financeSummary(session.tenantId),
      mgRealizedPercent(session.tenantId),
      sourcingSavings(session.tenantId),
      financialTimeline(session.tenantId),
      execTotals(session.tenantId),
      pipelineByStage(session.tenantId),
      attentionSignals(session.tenantId),
    ]);

  const won = pipeline.find((p) => p.stage === "ganho")?.count ?? 0;
  const lost = pipeline.find((p) => p.stage === "perdido")?.count ?? 0;
  const conversion = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  const exportColumns = [
    { key: "mes", label: "Mês" },
    { key: "receita", label: "Receita prevista (R$)" },
    { key: "royalties", label: "Royalties apurados (R$)" },
    { key: "compras", label: "Compras comprometidas (R$)" },
  ];
  const exportRows = timeline.labels.map((label, i) => ({
    mes: label,
    receita: timeline.receita[i] ?? 0,
    royalties: timeline.royalties[i] ?? 0,
    compras: timeline.compras[i] ?? 0,
  }));

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-600">Ao vivo</span>
          </div>
          <h1 className="mt-1 text-xl font-bold text-neutral-900 dark:text-white">Dashboard Executivo</h1>
          <p className="text-sm text-neutral-500">
            Visão executiva da operação — indicadores lidos do Supabase · {today}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <MiniStat label="Licenciados ativos" value={String(licensees)} accent={PAL.blue} icon={<Users size={16} />} />
          <MiniStat label="Contratos vigentes" value={String(contracts)} accent={PAL.indigo} icon={<FileText size={16} />} />
          <MiniStat label="Fornecedores ativos" value={String(suppliers)} accent={PAL.cyan} icon={<Layers size={16} />} />
          <MiniStat label="MG realizado" value={`${mgPct}%`} accent={PAL.emerald} icon={<TrendingUp size={16} />} />
        </div>
      </div>

      {/* Exportação */}
      <div className="mb-4 flex justify-end">
        <ExportGroup
          filename="dashboard-executivo"
          columns={exportColumns}
          rows={exportRows}
          title="Dashboard Executivo — Fluxo financeiro (12 meses)"
        />
      </div>

      {/* KPIs executivos */}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Faturamento" value={fmtCompactBRL(totals.faturamento)} icon={<Wallet size={16} />} accent={PAL.blue} delta={trendDelta(timeline.receita)} spark={timeline.receita} />
        <Kpi label="Royalties apurados" value={fmtCompactBRL(totals.royalties)} icon={<Coins size={16} />} accent={PAL.violet} delta={trendDelta(timeline.royalties)} spark={timeline.royalties} />
        <Kpi label="Compras comprometidas" value={fmtCompactBRL(totals.compras)} icon={<ShoppingCart size={16} />} accent={PAL.amber} delta={trendDelta(timeline.compras)} spark={timeline.compras} />
        <Kpi label="Pipeline ponderado" value={fmtCompactBRL(totals.pipelineWeighted)} icon={<Target size={16} />} accent={PAL.pink} sub={`${totals.pipelineOpen} oportunidade(s) em aberto`} />
        <Kpi label="Recebido" value={fmtCompactBRL(fin.received)} icon={<PiggyBank size={16} />} accent={PAL.emerald} sub={`A receber: ${fmtCompactBRL(fin.outstanding)}`} />
        <Kpi label="Em aberto" value={fmtCompactBRL(fin.outstanding)} icon={<Landmark size={16} />} accent={PAL.sky} sub={`Vencido: ${fmtCompactBRL(fin.overdue)}`} />
        <Kpi label="Savings de sourcing" value={fmtCompactBRL(savings.totalSavings)} icon={<PiggyBank size={16} />} accent={PAL.teal} />
        <Kpi label="Conversão do pipeline" value={`${conversion}%`} icon={<Activity size={16} />} accent={PAL.orange} sub={`${won} ganho(s) · ${lost} perdido(s)`} />
      </div>

      {/* Fluxo + medidores */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Fluxo financeiro — 12 meses" subtitle="Receita prevista · royalties apurados · compras" icon={<LineChart size={15} />} accent={PAL.blue} className="lg:col-span-2">
          <AreaLineChart
            labels={timeline.labels}
            height={240}
            format={(n) => fmtCompactBRL(n)}
            series={[
              { name: "Receita", color: PAL.blue, data: timeline.receita },
              { name: "Royalties", color: PAL.violet, data: timeline.royalties },
              { name: "Compras", color: PAL.amber, data: timeline.compras },
            ]}
          />
        </Panel>
        <Panel title="Medidores executivos" subtitle="Garantia mínima e conversão comercial" icon={<Gauge size={15} />} accent={PAL.emerald}>
          <div className="flex items-center justify-around gap-2 py-3">
            <RadialGauge pct={mgPct} label="MG realizado" color={PAL.emerald} />
            <RadialGauge pct={conversion} label="Conversão" color={PAL.pink} />
          </div>
        </Panel>
      </div>

      {/* Pontos de atenção */}
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={16} className="text-amber-500" />
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-neutral-600 dark:text-neutral-300">Pontos de atenção</h2>
        <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Link href="/documentos?highlight=vencidos">
          <AlertCard label="Documentos vencidos" count={attention.docsVencidos} hint="regularizar" accent={PAL.red} icon={<AlertTriangle size={20} />} />
        </Link>
        <Link href="/documentos?highlight=avencer">
          <AlertCard label="Docs a vencer (30d)" count={attention.docsAVencer} hint="renovar em breve" accent={PAL.amber} icon={<Clock size={20} />} />
        </Link>
        <Link href="/qualidade">
          <AlertCard label="NCs em aberto" count={attention.ncsAbertas} hint="qualidade" accent={PAL.orange} icon={<ShieldAlert size={20} />} />
        </Link>
        <Link href="/contratos?highlight=vencendo">
          <AlertCard label="Contratos vencendo" count={attention.contratosVencendo} hint="próx. 60 dias" accent={PAL.violet} icon={<FileText size={20} />} />
        </Link>
        <Link href="/royalties?highlight=pendentes">
          <AlertCard label="Royalties pendentes" count={attention.royaltiesPendentes} hint="validar/aprovar" accent={PAL.blue} icon={<Coins size={20} />} />
        </Link>
      </div>

      {/* Atalho para o BI */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-5 py-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <p className="flex items-center gap-2 text-[12.5px] text-neutral-500">
          <Radio size={14} className="text-emerald-500" />
          Precisa de detalhamento? Todas as análises e quebras por dimensão estão no BI &amp; Analytics.
        </p>
        <Link
          href="/bi"
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
        >
          Abrir BI &amp; Analytics <ArrowRight size={15} />
        </Link>
      </div>
    </div>
  );
}
