import { Megaphone, Wallet, TrendingUp, Target, Handshake } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { portalMarketing } from "@/lib/data/portal-insights";
import { Card, Badge } from "@/components/ui";
import { Panel, Kpi, DataTable, HBars, PAL } from "@/components/charts-pro";
import { fmtCompactBRL, fmtMoney } from "@/lib/utils";
import type { NotifTone } from "@/lib/notif-meta";

function statusTone(s: string): NotifTone {
  const v = s.toLowerCase();
  if (/(ativ|andamento|aprov)/.test(v)) return "good";
  if (/(pausad|cancel|encerr)/.test(v)) return "neutral";
  if (/(rascunho|planej)/.test(v)) return "info";
  return "info";
}

export default async function PortalMarketingPage() {
  const session = await requireLicenseeSession();
  const m = await portalMarketing(session.tenantId, session.licenseeId);
  const k = m.kpis;

  return (
    <div>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Megaphone size={20} className="text-emerald-600" /> Marketing
        </h1>
        <p className="text-sm text-neutral-500">
          Suas campanhas e ações de marketing cooperado (co-op) com a marca licenciada.
        </p>
      </div>

      {m.campaigns.length === 0 ? (
        <Card className="p-10 text-center text-sm text-neutral-400">
          Você ainda não tem campanhas de marketing vinculadas. Fale com seu gestor sobre ações co-op.
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Campanhas" value={String(k.count)} sub={`${k.active} ativa(s)`} icon={<Megaphone size={16} />} accent={PAL.emerald} />
            <Kpi label="Verba total" value={fmtCompactBRL(k.budget)} icon={<Wallet size={16} />} accent={PAL.blue} />
            <Kpi label="Investido" value={fmtCompactBRL(k.spent)} icon={<Target size={16} />} accent={PAL.amber} />
            <Kpi label="ROI" value={`${k.roi.toFixed(2)}x`} sub={`Receita: ${fmtCompactBRL(k.revenue)}`} icon={<TrendingUp size={16} />} accent={PAL.teal} />
          </div>

          <Panel title="Investido por campanha" icon={<Wallet size={15} />} accent={PAL.emerald} className="mt-6">
            <HBars
              items={m.campaigns.map((c) => ({ label: c.name, value: c.spent }))}
              format={(n) => fmtMoney(n, "BRL")}
            />
          </Panel>

          <Panel title="Campanhas" icon={<Megaphone size={15} />} accent={PAL.blue} className="mt-4">
            <DataTable
              columns={[
                { key: "name", label: "Campanha" },
                { key: "type", label: "Tipo" },
                { key: "channel", label: "Canal" },
                { key: "budget", label: "Verba", align: "right" },
                { key: "spent", label: "Investido", align: "right" },
                { key: "revenue", label: "Receita", align: "right" },
                { key: "status", label: "Status" },
              ]}
              rows={m.campaigns.map((c) => ({
                name: (
                  <span className="inline-flex items-center gap-1.5">
                    {c.coop && <Handshake size={13} className="text-emerald-500" />}
                    {c.name}
                  </span>
                ),
                type: c.type,
                channel: c.channel,
                budget: fmtMoney(c.budget, "BRL"),
                spent: fmtMoney(c.spent, "BRL"),
                revenue: fmtMoney(c.revenue, "BRL"),
                status: <Badge tone={statusTone(c.status)}>{c.status}</Badge>,
              }))}
            />
          </Panel>
        </>
      )}
    </div>
  );
}
