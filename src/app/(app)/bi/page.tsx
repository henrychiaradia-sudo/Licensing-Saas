import {
  Coins,
  ShoppingCart,
  BarChart3,
  ScatterChart as ScatterIcon,
  PieChart,
  Target,
  Microscope,
  ShieldAlert,
  Landmark,
  FileText,
  TrendingUp,
  Wallet,
  Percent,
  FileStack,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import {
  royaltiesByCompetencia,
  revenueByLicensee,
  purchasesBySupplier,
  receivablesByStatus,
} from "@/lib/data/bi";
import { listBrandOptions, listLicenseeOptions } from "@/lib/data/contracts";
import { listSupplierOptions } from "@/lib/data/purchase-orders";
import { parseView, type ViewScope } from "@/lib/view";
import { listLatestEvaluations } from "@/lib/data/evaluations";
import {
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
import { ExportGroup } from "@/components/export-group";
import { Panel, Kpi, DonutChart, HBars, ScatterChart, DataTable, MiniStat, PAL, SERIES } from "@/components/charts-pro";

const receivableStatusLabel: Record<string, string> = {
  previsto: "Previsto",
  emitido: "Emitido",
  parcial: "Parcial",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

const riskLabel: Record<SupplierRiskLevel, string> = { baixo: "Baixo", medio: "Médio", alto: "Alto", critico: "Crítico" };
const riskTextColor: Record<SupplierRiskLevel, string> = {
  baixo: "text-emerald-600 dark:text-emerald-400",
  medio: "text-amber-600 dark:text-amber-400",
  alto: "text-orange-600 dark:text-orange-400",
  critico: "text-red-600 dark:text-red-400",
};

function Section({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="mb-3 mt-7 flex items-center gap-2 first:mt-0">
      <span className="text-blue-600">{icon}</span>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-neutral-600 dark:text-neutral-300">{label}</h2>
      <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800" />
    </div>
  );
}

export default async function BiPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await requireSession();
  const { view: viewRaw } = await searchParams;
  const view = parseView(viewRaw);

  let scope: ViewScope = {};
  let viewLabel: string | null = null;
  if (view) {
    if (view.dim === "marca") {
      const m = (await listBrandOptions(session.tenantId)).find((o) => o.id === view.id);
      if (m) {
        scope = { brandId: view.id };
        viewLabel = `Marca · ${m.name}`;
      }
    } else if (view.dim === "licenciado") {
      const m = (await listLicenseeOptions(session.tenantId)).find((o) => o.id === view.id);
      if (m) {
        scope = { licenseeId: view.id };
        viewLabel = `Licenciado · ${m.legalName}`;
      }
    } else {
      const m = (await listSupplierOptions(session.tenantId)).find((o) => o.id === view.id);
      if (m) {
        scope = { supplierId: view.id };
        viewLabel = `Fornecedor · ${m.tradeName || m.legalName}`;
      }
    }
  }

  const [
    royalties,
    revenue,
    purchases,
    receivables,
    evaluations,
    totals,
    pipeline,
    quality,
    risk,
    ctrMix,
    aging,
    scatter,
    royStatus,
  ] = await Promise.all([
    royaltiesByCompetencia(session.tenantId, scope),
    revenueByLicensee(session.tenantId, scope),
    purchasesBySupplier(session.tenantId, scope),
    receivablesByStatus(session.tenantId, scope),
    listLatestEvaluations(session.tenantId),
    execTotals(session.tenantId, scope),
    pipelineByStage(session.tenantId, scope),
    qualityBreakdown(session.tenantId, scope),
    supplierRiskMix(session.tenantId),
    contractStatusMix(session.tenantId, scope),
    receivablesAging(session.tenantId, scope),
    salesRoyaltyScatter(session.tenantId, scope),
    royaltyStatusMix(session.tenantId, scope),
  ]);

  const recItems = receivables.map((r) => ({ label: receivableStatusLabel[r.label] ?? r.label, value: r.value }));
  const openStages = pipeline.filter((p) => p.stage !== "ganho" && p.stage !== "perdido");
  const pipelineItems = openStages.map((p) => ({ label: `${p.label} · ${p.count}`, value: p.value }));
  const won = pipeline.find((p) => p.stage === "ganho")?.count ?? 0;
  const lost = pipeline.find((p) => p.stage === "perdido")?.count ?? 0;
  const conversion = won + lost > 0 ? Math.round((won / (won + lost)) * 100) : 0;

  const grossSales = scatter.reduce((a, b) => a + b.x, 0);
  const reportes = royStatus.reduce((a, b) => a + b.value, 0);
  const margem = grossSales > 0 ? (totals.royalties / grossSales) * 100 : 0;

  const scatterPoints = scatter.map((p, i) => ({
    x: p.x,
    y: p.y,
    r: 6,
    color: SERIES[i % SERIES.length],
    label: p.label,
  }));

  const exportColumns = [
    { key: "licenciado", label: "Licenciado" },
    { key: "receita", label: "Receita (R$)" },
  ];
  const exportRows = revenue.map((r) => ({ licenciado: r.label, receita: r.value }));

  const topEvals = [...evaluations].sort((a, b) => (b.overallScore ?? 0) - (a.overallScore ?? 0)).slice(0, 8);
  const evalRows = topEvals.map((e) => ({
    forn: e.supplierName ?? "—",
    periodo: e.periodLabel,
    score: <span className="font-semibold text-neutral-900 dark:text-white">{e.overallScore}</span>,
    risco: <span className={riskTextColor[e.riskLevel]}>{riskLabel[e.riskLevel]}</span>,
  }));

  return (
    <div>
      {/* Cabeçalho */}
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
          <BarChart3 size={22} />
        </span>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">BI &amp; Analytics</h1>
          <p className="text-sm text-neutral-500">
            Detalhamentos e análises por dimensão — royalties, vendas, comercial, suprimentos e qualidade
          </p>
        </div>
        <div className="ml-auto">
          <ExportGroup
            filename="bi-receita-por-licenciado"
            columns={exportColumns}
            rows={exportRows}
            title="BI & Analytics — Receita por licenciado"
            pdfOrientation="portrait"
          />
        </div>
      </div>

      {viewLabel && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
          <span className="font-semibold">Visão: {viewLabel}</span>
          <span className="text-blue-600/70 dark:text-blue-300/70">
            — painéis filtrados onde a dimensão se aplica.
          </span>
          <Link href="/bi" className="ml-auto text-xs font-medium hover:underline">
            Ver consolidado
          </Link>
        </div>
      )}

      {/* Métricas analíticas (distintas do dashboard) */}
      <div className="mb-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Vendas brutas reportadas" value={fmtCompactBRL(grossSales)} icon={<Wallet size={16} />} accent={PAL.cyan} />
        <Kpi label="Margem média de royalty" value={`${margem.toFixed(1)}%`} icon={<Percent size={16} />} accent={PAL.violet} />
        <Kpi label="Reportes de royalties" value={String(reportes)} icon={<FileStack size={16} />} accent={PAL.blue} />
        <Kpi label="Fornecedores avaliados" value={String(risk.evaluated)} icon={<Trophy size={16} />} accent={PAL.emerald} sub={`Score médio ${risk.avgScore}`} />
      </div>

      {/* Financeiro & Recebíveis */}
      <Section label="Financeiro & Recebíveis" icon={<Landmark size={16} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Recebíveis por status" icon={<PieChart size={15} />} accent={PAL.emerald} className="lg:col-span-2">
          <DonutChart items={recItems} centerLabel="títulos" format={(n) => fmtCompactBRL(n)} />
        </Panel>
        <Panel title="Aging de recebíveis" subtitle="Saldo em aberto por faixa" icon={<Landmark size={15} />} accent={PAL.sky}>
          <HBars items={aging} format={(n) => fmtMoney(n)} />
        </Panel>
        <Panel title="Receita por licenciado" icon={<Wallet size={15} />} accent={PAL.cyan} className="lg:col-span-3">
          <HBars items={revenue.slice(0, 8)} format={(n) => fmtMoney(n)} />
        </Panel>
      </div>

      {/* Royalties & Vendas */}
      <Section label="Royalties & Vendas" icon={<Coins size={16} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Vendas brutas × Royalties" subtitle="Cada bolha = um reporte de royalties" icon={<ScatterIcon size={15} />} accent={PAL.pink} className="lg:col-span-2">
          <ScatterChart points={scatterPoints} xLabel="Vendas brutas" yLabel="Royalties ↑" format={(n) => fmtCompactBRL(n)} height={250} />
        </Panel>
        <Panel title="Royalties por status" icon={<Coins size={15} />} accent={PAL.violet}>
          <DonutChart items={royStatus} centerLabel="reportes" format={(n) => String(n)} />
        </Panel>
        <Panel title="Royalties por competência" icon={<Coins size={15} />} accent={PAL.violet} className="lg:col-span-3">
          <HBars items={royalties.map((r, i) => ({ ...r, color: SERIES[i % SERIES.length] }))} format={(n) => fmtMoney(n)} />
        </Panel>
      </div>

      {/* Comercial */}
      <Section label="Comercial — Pipeline" icon={<Target size={16} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Pipeline por estágio" subtitle="Valor estimado no funil" icon={<Target size={15} />} accent={PAL.pink} className="lg:col-span-2">
          <HBars items={pipelineItems} format={(n) => fmtMoney(n)} />
        </Panel>
        <Panel title="Resultado comercial" icon={<Trophy size={15} />} accent={PAL.emerald}>
          <div className="grid gap-2.5 py-1">
            <MiniStat label="Oportunidades ganhas" value={String(won)} accent={PAL.emerald} icon={<Trophy size={16} />} />
            <MiniStat label="Oportunidades perdidas" value={String(lost)} accent={PAL.red} icon={<Target size={16} />} />
            <MiniStat label="Taxa de conversão" value={`${conversion}%`} accent={PAL.blue} icon={<Percent size={16} />} />
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
            <p className="py-8 text-center text-[13px] text-neutral-400">Sem avaliações.</p>
          )}
        </Panel>
      </div>

      {/* Qualidade & Governança */}
      <Section label="Qualidade & Governança" icon={<Microscope size={16} />} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Inspeções de qualidade" subtitle={`${quality.openNc} NC(s) em aberto`} icon={<Microscope size={15} />} accent={PAL.teal}>
          {quality.inspections.length ? (
            <DonutChart items={quality.inspections} size={140} thickness={20} centerLabel="inspeções" format={(n) => String(n)} />
          ) : (
            <p className="py-8 text-center text-[13px] text-neutral-400">Sem inspeções.</p>
          )}
        </Panel>
        <Panel title="NCs por severidade" icon={<ShieldAlert size={15} />} accent={PAL.red}>
          {quality.ncBySeverity.length ? (
            <HBars items={quality.ncBySeverity} format={(n) => `${n} NC`} />
          ) : (
            <p className="py-8 text-center text-[13px] text-neutral-400">Sem não conformidades.</p>
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
