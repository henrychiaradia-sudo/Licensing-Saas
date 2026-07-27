import { Coins, Wallet, ShoppingCart, PiggyBank } from "lucide-react";
import { requireSession } from "@/lib/auth";
import {
  royaltiesByCompetencia,
  purchasesBySupplier,
  receivablesByStatus,
  revenueByLicensee,
  type Slice,
} from "@/lib/data/bi";
import { sourcingSavings } from "@/lib/data/sourcing";
import { listLatestEvaluations } from "@/lib/data/evaluations";
import { Card } from "@/components/ui";
import { fmtCompactBRL, fmtMoney } from "@/lib/utils";
import type { SupplierRiskLevel } from "@/lib/db/schema";

const riskOrder: SupplierRiskLevel[] = ["baixo", "medio", "alto", "critico"];
const riskLabel: Record<SupplierRiskLevel, string> = {
  baixo: "Baixo",
  medio: "Médio",
  alto: "Alto",
  critico: "Crítico",
};

const receivableStatusLabel: Record<string, string> = {
  previsto: "Previsto",
  emitido: "Emitido",
  parcial: "Parcial",
  pago: "Pago",
  vencido: "Vencido",
  cancelado: "Cancelado",
};

export default async function BiPage() {
  const session = await requireSession();
  const [royalties, purchases, receivables, revenue, savings, evaluations] = await Promise.all([
    royaltiesByCompetencia(session.tenantId),
    purchasesBySupplier(session.tenantId),
    receivablesByStatus(session.tenantId),
    revenueByLicensee(session.tenantId),
    sourcingSavings(session.tenantId),
    listLatestEvaluations(session.tenantId),
  ]);

  const sum = (arr: Slice[]) => arr.reduce((a, b) => a + b.value, 0);
  const receivablesLabeled = receivables.map((r) => ({
    label: receivableStatusLabel[r.label] ?? r.label,
    value: r.value,
  }));

  const riskCounts = riskOrder
    .map((r) => ({
      label: riskLabel[r],
      value: evaluations.filter((e) => e.riskLevel === r).length,
    }))
    .filter((s) => s.value > 0);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">BI &amp; Analytics</h1>
        <p className="text-sm text-neutral-500">
          Visão analítica consolidada de royalties, receita e suprimentos
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Royalties acumulados" value={fmtCompactBRL(sum(royalties))} icon={<Coins size={18} className="text-amber-600" />} />
        <Kpi label="Receita faturada" value={fmtCompactBRL(sum(revenue))} icon={<Wallet size={18} className="text-emerald-600" />} />
        <Kpi label="Compras comprometidas" value={fmtCompactBRL(sum(purchases))} icon={<ShoppingCart size={18} className="text-blue-600" />} />
        <Kpi label="Savings de sourcing" value={fmtCompactBRL(savings.totalSavings)} icon={<PiggyBank size={18} className="text-emerald-600" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="Royalties por competência">
          <BarList data={royalties} format={(n) => fmtMoney(n)} />
        </ChartCard>
        <ChartCard title="Receita por licenciado">
          <BarList data={revenue} format={(n) => fmtMoney(n)} />
        </ChartCard>
        <ChartCard title="Recebíveis por status">
          <BarList data={receivablesLabeled} format={(n) => fmtMoney(n)} />
        </ChartCard>
        <ChartCard title="Compras por fornecedor">
          <BarList data={purchases} format={(n) => fmtMoney(n)} />
        </ChartCard>
        <ChartCard title="Risco de fornecedores (avaliados)">
          <BarList data={riskCounts} format={(n) => `${n} fornecedor(es)`} />
        </ChartCard>
      </div>
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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="mb-4 text-sm font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

function BarList({ data, format }: { data: Slice[]; format: (n: number) => string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  if (data.length === 0) return <p className="text-sm text-neutral-400">Sem dados.</p>;
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="mb-1 flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-neutral-600 dark:text-neutral-300">{d.label}</span>
            <span className="shrink-0 font-medium tabular-nums">{format(d.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
