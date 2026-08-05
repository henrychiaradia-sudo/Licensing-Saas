import { Gauge, ShieldAlert } from "lucide-react";
import { requireSupplierSession } from "@/lib/auth";
import { listSupplierEvaluations } from "@/lib/data/supplier-portal";
import { computeSupplierPerformance } from "@/lib/data/evaluations";
import { Card, Badge } from "@/components/ui";
import { fmtMoney } from "@/lib/utils";
import type { SupplierRiskLevel } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";
const riskTone: Record<SupplierRiskLevel, Tone> = { baixo: "good", medio: "info", alto: "warn", critico: "danger" };
const riskLabel: Record<SupplierRiskLevel, string> = {
  baixo: "Risco baixo",
  medio: "Risco médio",
  alto: "Risco alto",
  critico: "Risco crítico",
};

export default async function SupplierPerformancePage() {
  const session = await requireSupplierSession();
  const [perf, evals] = await Promise.all([
    computeSupplierPerformance(session.tenantId, session.supplierId),
    listSupplierEvaluations(session.tenantId, session.supplierId),
  ]);
  const latest = evals[0] ?? null;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Desempenho</h1>
          <p className="text-sm text-neutral-500">Como a NovaSport avalia sua parceria</p>
        </div>
        {latest && <Badge tone={riskTone[latest.riskLevel]}>{riskLabel[latest.riskLevel]}</Badge>}
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Aprovação qualidade" value={perf.approvalRate != null ? `${perf.approvalRate}%` : "—"} hint={`${perf.inspections} inspeç.`} />
        <Metric label="Entrega no prazo" value={perf.onTimeRate != null ? `${perf.onTimeRate}%` : "—"} hint={`${perf.ordersReceived} receb.`} />
        <Metric label="Volume comprometido" value={fmtMoney(perf.committedSpend)} hint={`${perf.poCount} pedido(s)`} />
        <Metric label="NCs abertas" value={String(perf.openNc)} tone={perf.openNc > 0 ? "danger" : undefined} />
      </div>

      <Card className="p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <ShieldAlert size={16} className="text-indigo-500" /> Scorecard
        </h2>
        {evals.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma avaliação registrada ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th scope="col" className="px-3 py-2 font-medium">Período</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Qual.</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Entr.</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Custo</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Conf.</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Geral</th>
                  <th scope="col" className="px-3 py-2 font-medium">Risco</th>
                </tr>
              </thead>
              <tbody>
                {evals.map((e) => (
                  <tr key={e.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="px-3 py-2 font-medium">{e.periodLabel}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.qualityScore}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.deliveryScore}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.costScore}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{e.complianceScore}</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">{e.overallScore}</td>
                    <td className="px-3 py-2">
                      <Badge tone={riskTone[e.riskLevel]}>{riskLabel[e.riskLevel]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {latest?.weaknesses && (
          <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-500 dark:border-neutral-800">
            <span className="text-neutral-400">Pontos de atenção:</span> {latest.weaknesses}
          </p>
        )}
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "danger";
}) {
  return (
    <Card className="p-5">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div className={`mt-2 text-xl font-bold tabular-nums ${tone === "danger" ? "text-red-600" : ""}`}>
        {value}
      </div>
      {hint && <div className="text-[11px] text-neutral-400">{hint}</div>}
    </Card>
  );
}

export const dynamic = "force-dynamic";
