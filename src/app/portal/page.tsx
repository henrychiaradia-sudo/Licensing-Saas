import Link from "next/link";
import {
  FileText,
  Coins,
  Wallet,
  Landmark,
  Package,
  Send,
  AlertTriangle,
  RefreshCw,
  Target,
  TrendingUp,
} from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { portalDashboard } from "@/lib/data/portal-insights";
import { Card, Button } from "@/components/ui";
import {
  Panel,
  Kpi,
  AreaLineChart,
  DonutChart,
  HBars,
  RadialGauge,
  PAL,
} from "@/components/charts-pro";
import { fmtCompactBRL, fmtMoney, fmtDate } from "@/lib/utils";

const ROYALTY_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  em_validacao: "Em validação",
  com_divergencia: "Divergência",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

const AGING_COLOR: Record<string, string> = {
  "A vencer": PAL.emerald,
  "Vencido ≤30d": PAL.amber,
  "Vencido 31–60d": PAL.orange,
  "Vencido +60d": PAL.red,
};

export default async function PortalHome() {
  const session = await requireLicenseeSession();
  const d = await portalDashboard(session.tenantId, session.licenseeId);
  const k = d.kpis;
  const pend = d.pendencias;
  const hasPend = pend.reprovedProducts.length + pend.divergentReports.length + pend.overdue.length > 0;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Bem-vindo, {session.name.split(" ")[0]}</h1>
          <p className="text-sm text-neutral-500">
            Painel do Licenciado · sua operação de licenciamento em um só lugar.
          </p>
        </div>
        <Link href="/portal/royalties/novo">
          <Button>
            <Send size={15} /> Enviar reporte
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Contratos vigentes" value={String(k.activeContracts)} icon={<FileText size={16} />} accent={PAL.teal} />
        <Kpi label="Royalties apurados" value={fmtCompactBRL(k.royaltiesYtd)} icon={<Coins size={16} />} accent={PAL.emerald} />
        <Kpi
          label="A pagar"
          value={fmtCompactBRL(k.outstanding)}
          sub={k.overdue > 0 ? `Vencido: ${fmtCompactBRL(k.overdue)}` : "Nada vencido"}
          icon={<Wallet size={16} />}
          accent={k.overdue > 0 ? PAL.red : PAL.amber}
        />
        <Kpi label="Faturado" value={fmtCompactBRL(k.billed)} icon={<Landmark size={16} />} accent={PAL.blue} />
        <Kpi label="Produtos" value={String(k.products)} icon={<Package size={16} />} accent={PAL.violet} />
      </div>

      {/* Pendências */}
      {hasPend && (
        <Card className="mt-6 border-amber-200 bg-amber-50/50 p-5 dark:border-amber-900/50 dark:bg-amber-950/10">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle size={15} className="text-amber-600" /> Pendências
          </h2>
          <ul className="space-y-2.5">
            {pend.reprovedProducts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  Produto reprovado: <strong>{p.name}</strong>{" "}
                  <span className="text-neutral-400">({p.sku})</span>
                </span>
                <Link
                  href={`/portal/produtos/${p.id}/reenviar`}
                  className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  <RefreshCw size={13} /> Reenviar nova versão
                </Link>
              </li>
            ))}
            {pend.divergentReports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  Reporte com divergência: <strong>{r.referenceLabel}</strong>
                </span>
                <Link href={`/portal/royalties/${r.id}`} className="font-medium text-emerald-700 hover:underline dark:text-emerald-400">
                  Revisar
                </Link>
              </li>
            ))}
            {pend.overdue.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  Recebível vencido: <strong>{o.description ?? "—"}</strong>{" "}
                  <span className="text-neutral-400">vence {fmtDate(o.dueDate)}</span>
                </span>
                <Link href="/portal/financeiro" className="font-medium tabular-nums text-red-600 hover:underline">
                  {fmtMoney(Number(o.amount) - Number(o.paidAmount), o.currencyIso ?? "BRL")}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Gráficos */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel
          title="Royalties e faturamento — 12 meses"
          icon={<TrendingUp size={15} />}
          accent={PAL.emerald}
          className="lg:col-span-2"
        >
          <AreaLineChart
            labels={d.timeline.map((t) => t.label)}
            series={[
              { name: "Royalties apurados", color: PAL.emerald, data: d.timeline.map((t) => t.royalties) },
              { name: "Faturado", color: PAL.blue, data: d.timeline.map((t) => t.billed) },
            ]}
            format={(n) => fmtCompactBRL(n)}
          />
        </Panel>

        <Panel title="Garantia mínima realizada" icon={<Target size={15} />} accent={PAL.teal}>
          <div className="flex flex-col items-center gap-2 py-2">
            <RadialGauge pct={k.mgRealizedPct} label="do MG" color={PAL.teal} />
            <p className="text-center text-[12px] text-neutral-500">
              {fmtCompactBRL(k.royaltiesYtd)} apurados de {fmtCompactBRL(k.mgTotal)} de garantia mínima.
            </p>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Reportes por status" icon={<Coins size={15} />} accent={PAL.violet}>
          {d.royaltyMix.length > 0 ? (
            <DonutChart
              items={d.royaltyMix.map((m) => ({
                label: ROYALTY_STATUS_LABEL[m.label] ?? m.label,
                value: m.value,
              }))}
              centerLabel="reportes"
              format={(n) => String(n)}
            />
          ) : (
            <p className="py-6 text-center text-[13px] text-neutral-400">Você ainda não enviou reportes.</p>
          )}
        </Panel>

        <Panel title="Recebíveis em aberto" icon={<Wallet size={15} />} accent={PAL.amber}>
          {d.aging.length > 0 ? (
            <HBars
              items={d.aging.map((a) => ({ label: a.label, value: a.value, color: AGING_COLOR[a.label] ?? PAL.amber }))}
              format={(n) => fmtMoney(n, "BRL")}
            />
          ) : (
            <p className="py-6 text-center text-[13px] text-neutral-400">Nenhum recebível em aberto — tudo em dia.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
