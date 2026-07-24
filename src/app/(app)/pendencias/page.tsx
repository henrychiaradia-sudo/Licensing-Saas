import Link from "next/link";
import { Coins, ClipboardCheck, Bell, ChevronRight } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getInternalPendencias } from "@/lib/data/alerts";
import { Card, Badge } from "@/components/ui";
import { fmtMoney, fmtDate } from "@/lib/utils";
import type { AlertType } from "@/lib/db/schema";

const alertLabel: Record<AlertType, string> = {
  renovacao: "Renovação",
  vencimento: "Vencimento",
  mg_shortfall: "Shortfall de garantia mínima",
  pagamento_vencido: "Pagamento vencido",
  documento_vencido: "Documento vencido",
};

export default async function PendenciasPage() {
  const session = await requireSession();
  const { reports, products, alerts } = await getInternalPendencias(session.tenantId);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Pendências</h1>
        <p className="text-sm text-neutral-500">Itens que aguardam ação do time de licenciamento.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Reportes a aprovar" value={reports.length} icon={<Coins size={18} className="text-blue-600" />} />
        <Kpi label="Produtos a revisar" value={products.length} icon={<ClipboardCheck size={18} className="text-violet-600" />} />
        <Kpi label="Alertas de contrato" value={alerts.length} icon={<Bell size={18} className="text-amber-600" />} />
      </div>

      <Card className="mt-6 p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Reportes de royalties a aprovar</h2>
        </div>
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {reports.map((r) => (
            <li key={r.id}>
              <Link
                href={`/royalties/${r.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <div>
                  <div className="text-sm font-medium">
                    {r.referenceLabel} · {r.licenseeName ?? "—"}
                  </div>
                  <div className="text-xs text-neutral-400">{r.contractNumber ?? "—"}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-sm font-medium">
                    {fmtMoney(r.royaltyCalculated, r.currencyIso ?? "BRL")}
                  </span>
                  <Badge tone={r.status === "com_divergencia" ? "warn" : "info"}>
                    {r.status === "com_divergencia" ? "Com divergência" : "Enviado"}
                  </Badge>
                  <ChevronRight size={16} className="text-neutral-300" />
                </div>
              </Link>
            </li>
          ))}
          {reports.length === 0 && <Empty>Nenhum reporte aguardando aprovação.</Empty>}
        </ul>
      </Card>

      <Card className="mt-4 p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Produtos aguardando parecer</h2>
        </div>
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {products.map((p) => (
            <li key={p.id}>
              <Link
                href={`/produtos/${p.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <div>
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-neutral-400">
                    {p.sku} · {p.licenseeName ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone="warn">{p.pending} alçada(s) pendente(s)</Badge>
                  <ChevronRight size={16} className="text-neutral-300" />
                </div>
              </Link>
            </li>
          ))}
          {products.length === 0 && <Empty>Nenhum produto aguardando parecer.</Empty>}
        </ul>
      </Card>

      <Card className="mt-4 p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Alertas de contrato</h2>
        </div>
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {alerts.map((a) => (
            <li key={a.id}>
              <Link
                href={`/contratos/${a.contractId}`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <div>
                  <div className="text-sm font-medium">{alertLabel[a.alertType]}</div>
                  <div className="text-xs text-neutral-400">
                    {a.contractNumber ?? "—"} · {a.licenseeName ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums text-xs text-neutral-500">{fmtDate(a.triggerDate)}</span>
                  <Badge tone={a.status === "disparado" ? "warn" : "info"}>{a.status}</Badge>
                  <ChevronRight size={16} className="text-neutral-300" />
                </div>
              </Link>
            </li>
          ))}
          {alerts.length === 0 && <Empty>Nenhum alerta de contrato ativo.</Empty>}
        </ul>
      </Card>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
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

function Empty({ children }: { children: React.ReactNode }) {
  return <li className="px-5 py-8 text-center text-sm text-neutral-400">{children}</li>;
}
