import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  Megaphone,
  Coins,
  Plus,
  ArrowRight,
  Radio,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { marketingSummary } from "@/lib/data/marketing";
import { plansSummary } from "@/lib/data/marketing-plans";
import { registryCounts } from "@/lib/data/marketing-registry";
import {
  spendByType,
  spendByChannel,
  coopVsOwn,
  paidVsEarnedMedia,
  budgetVsRealized,
  roiByCampaign,
  monthlyTrend,
  upcomingActions,
} from "@/lib/data/marketing-analytics";
import { Card, StatCard, Badge, Button } from "@/components/ui";
import { BarList, Donut, GroupedBars, SplitBar, ColumnTrend } from "@/components/charts";
import { fmtCompactBRL, fmtBRL, fmtPct, fmtDate } from "@/lib/utils";
import { MarketingNav } from "./nav";
import { actionTypeLabel } from "./labels";

function fmtInt(n: number) {
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}
function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${meses[Number(m) - 1] ?? m}/${y.slice(2)}`;
}

export default async function MarketingDashboardPage() {
  const session = await requireSession();
  const today = new Date().toISOString().slice(0, 10);
  const [summary, plans, counts, byType, byChannel, coop, media, budgetReal, roi, trend, upcoming] =
    await Promise.all([
      marketingSummary(session.tenantId),
      plansSummary(session.tenantId),
      registryCounts(session.tenantId),
      spendByType(session.tenantId),
      spendByChannel(session.tenantId),
      coopVsOwn(session.tenantId),
      paidVsEarnedMedia(session.tenantId),
      budgetVsRealized(session.tenantId),
      roiByCampaign(session.tenantId),
      monthlyTrend(session.tenantId),
      upcomingActions(session.tenantId, today, 6),
    ]);

  const bestRoi = roi.filter((r) => r.roi != null).slice(0, 6);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Marketing</h1>
          <p className="text-sm text-neutral-500">
            Planejamento, execução e análise de resultados — dados lidos do Supabase em tempo real.
          </p>
        </div>
        <Link href="/marketing/campanhas/nova">
          <Button>
            <Plus size={16} /> Nova campanha
          </Button>
        </Link>
      </div>

      <MarketingNav />

      {/* KPIs principais */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orçamento de campanhas"
          value={fmtCompactBRL(summary.budget)}
          hint={`${plans.total} plano(s) · verba ${fmtCompactBRL(plans.budget)}`}
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
          label="Receita atribuída"
          value={fmtCompactBRL(summary.revenue)}
          hint={`${summary.active} campanha(s) ativa(s)`}
          icon={<Coins size={20} />}
          tone="blue"
        />
        <StatCard
          label="ROI global"
          value={summary.roi != null ? fmtPct(summary.roi) : "—"}
          hint="(receita − gasto) / gasto"
          icon={<Megaphone size={20} />}
          tone="blue"
        />
      </div>

      {/* Linha 1: orçado × realizado + gasto por tática */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Orçado × Realizado por campanha</h2>
            <Link href="/marketing/verbas" className="text-xs font-medium text-blue-600 hover:underline">
              Ver verbas
            </Link>
          </div>
          <GroupedBars
            rows={budgetReal.map((r) => ({ label: r.name, a: r.budget, b: r.spent }))}
            format={fmtCompactBRL}
          />
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Investimento por tática</h2>
          <Donut items={byType} format={fmtCompactBRL} centerLabel="total" />
        </Card>
      </div>

      {/* Linha 2: gasto por canal + evolução mensal */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Investimento por canal</h2>
          <BarList items={byChannel} format={fmtCompactBRL} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold">Evolução mensal</h2>
          <p className="mb-3 text-xs text-neutral-500">Gasto e receita das ações datadas.</p>
          <ColumnTrend
            rows={trend.map((t) => ({ label: monthLabel(t.month), a: t.spent, b: t.revenue }))}
            format={fmtCompactBRL}
          />
        </Card>
      </div>

      {/* Linha 3: própria×cooperada + paga×espontânea + ROI ranking */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold">Verba própria × cooperada</h2>
          <p className="mb-4 text-xs text-neutral-500">Divisão do investimento em ações.</p>
          <SplitBar
            a={coop.own}
            b={coop.coop}
            aLabel="Própria"
            bLabel="Cooperada"
            format={fmtCompactBRL}
          />
          <div className="mt-5 flex items-center gap-2 text-xs text-neutral-500">
            <Radio size={14} className="text-blue-500" />
            {coop.own + coop.coop > 0
              ? `${Math.round((coop.coop / (coop.own + coop.coop)) * 100)}% do investimento é cooperado com licenciados.`
              : "Sem investimento registrado."}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-1 text-sm font-semibold">Mídia paga × espontânea</h2>
          <p className="mb-4 text-xs text-neutral-500">Investimento pago e alcance conquistado.</p>
          <dl className="space-y-2.5 text-sm">
            <Row label="Investimento em mídia paga" value={fmtBRL(media.paidSpent)} />
            <Row label="Alcance mídia paga" value={fmtInt(media.paidReach)} />
            <Row label="Alcance espontâneo (PR)" value={fmtInt(media.earnedReach)} />
            <Row label="Alcance social/conteúdo" value={fmtInt(media.socialReach)} />
          </dl>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Melhores ROIs</h2>
            <Link href="/marketing/campanhas" className="text-xs font-medium text-blue-600 hover:underline">
              Campanhas
            </Link>
          </div>
          {bestRoi.length === 0 ? (
            <p className="py-4 text-sm text-neutral-400">Sem ROI calculável ainda.</p>
          ) : (
            <ul className="space-y-2.5">
              {bestRoi.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/marketing/campanhas/${r.id}`}
                    className="flex items-center justify-between gap-2 text-sm hover:text-blue-600"
                  >
                    <span className="min-w-0 truncate">{r.name}</span>
                    <Badge tone={(r.roi ?? 0) >= 0 ? "good" : "danger"}>{fmtPct(r.roi)}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Próximas ações + atalhos */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays size={15} className="text-neutral-400" /> Próximas ações
            </h2>
            <Link href="/marketing/calendario" className="text-xs font-medium text-blue-600 hover:underline">
              Ver calendário
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="py-4 text-sm text-neutral-400">Nenhuma ação agendada a partir de hoje.</p>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                  <Link href={`/marketing/acoes/${a.id}`} className="min-w-0 hover:text-blue-600">
                    <div className="truncate text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-neutral-500">
                      {actionTypeLabel[a.actionType]}
                      {a.campaignName ? ` · ${a.campaignName}` : ""}
                    </div>
                  </Link>
                  <span className="shrink-0 text-xs tabular-nums text-neutral-500">
                    {fmtDate(a.startDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Atalhos</h2>
          <div className="space-y-2">
            <Shortcut href="/marketing/planos" icon={<Sparkles size={15} />} label="Planos de marketing" />
            <Shortcut href="/marketing/acoes/nova" icon={<Plus size={15} />} label="Registrar ação/tática" />
            <Shortcut
              href="/marketing/agencias"
              icon={<Megaphone size={15} />}
              label={`Agências (${counts.agencies})`}
            />
            <Shortcut
              href="/marketing/influenciadores"
              icon={<TrendingUp size={15} />}
              label={`Influenciadores (${counts.influencers})`}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function Shortcut({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2.5 text-sm hover:border-blue-300 hover:bg-blue-50/40 dark:border-neutral-800 dark:hover:bg-blue-950/20"
    >
      <span className="flex items-center gap-2.5 font-medium">
        <span className="text-neutral-400 group-hover:text-blue-500">{icon}</span>
        {label}
      </span>
      <ArrowRight size={15} className="text-neutral-300 group-hover:text-blue-500" />
    </Link>
  );
}
