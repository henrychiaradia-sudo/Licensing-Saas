import { Landmark, FileText, Scale, Receipt, TrendingUp } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { portalControladoria } from "@/lib/data/portal-insights";
import { Badge } from "@/components/ui";
import { Panel, Kpi, DataTable, HBars, PAL } from "@/components/charts-pro";
import { fmtCompactBRL, fmtMoney } from "@/lib/utils";
import type { NotifTone } from "@/lib/notif-meta";

function statusTone(s: string): NotifTone {
  const v = s.toLowerCase();
  if (/(aprov|pag|liquid|valid)/.test(v)) return "good";
  if (/(diverg|rejeit|venc|cancel|atras)/.test(v)) return "danger";
  if (/(rascunho)/.test(v)) return "neutral";
  return "info";
}

const LEDGER_LABEL: Record<string, string> = {
  royalty: "Royalties",
  minimum_guarantee: "Garantia mínima",
  adjustment: "Ajustes",
  credit: "Créditos",
  debit: "Débitos",
  fee: "Taxas",
};

export default async function ControladoriaPage() {
  const session = await requireLicenseeSession();
  const c = await portalControladoria(session.tenantId, session.licenseeId);
  const t = c.totals;

  return (
    <div>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Landmark size={20} className="text-emerald-600" /> Controladoria
        </h1>
        <p className="text-sm text-neutral-500">
          Apuração de royalties, notas fiscais e razão financeira — tudo do seu contrato.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Royalties declarados" value={fmtCompactBRL(t.declared)} icon={<FileText size={16} />} accent={PAL.blue} />
        <Kpi label="Royalties apurados" value={fmtCompactBRL(t.calculated)} icon={<Scale size={16} />} accent={PAL.emerald} />
        <Kpi
          label="Variação (apurado − declarado)"
          value={fmtCompactBRL(t.variance)}
          icon={<TrendingUp size={16} />}
          accent={Math.abs(t.variance) > 0.01 ? PAL.amber : PAL.teal}
        />
        <Kpi label="Faturado" value={fmtCompactBRL(t.billed)} sub={`${t.openInvoices} nota(s) em aberto`} icon={<Receipt size={16} />} accent={PAL.violet} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title="Apuração de royalties por competência" icon={<Scale size={15} />} accent={PAL.emerald} className="lg:col-span-2">
          <DataTable
            columns={[
              { key: "ref", label: "Competência" },
              { key: "net", label: "Vendas líq.", align: "right" },
              { key: "declared", label: "Declarado", align: "right" },
              { key: "calc", label: "Apurado", align: "right" },
              { key: "var", label: "Variação", align: "right" },
              { key: "status", label: "Status" },
            ]}
            rows={c.reports.map((r) => ({
              ref: r.ref,
              net: fmtMoney(r.netSales, r.currency),
              declared: fmtMoney(r.declared, r.currency),
              calc: fmtMoney(r.calculated, r.currency),
              var: (
                <span className={r.variance > 0.01 ? "text-amber-600" : r.variance < -0.01 ? "text-red-600" : ""}>
                  {fmtMoney(r.variance, r.currency)}
                </span>
              ),
              status: <Badge tone={statusTone(r.status)}>{r.status}</Badge>,
            }))}
          />
        </Panel>

        <Panel title="Razão financeira" icon={<Landmark size={15} />} accent={PAL.teal}>
          {c.ledger.length > 0 ? (
            <HBars
              items={c.ledger.map((l) => ({ label: LEDGER_LABEL[l.type] ?? l.type, value: Math.abs(l.total) }))}
              format={(n) => fmtMoney(n, "BRL")}
            />
          ) : (
            <p className="py-6 text-center text-[13px] text-neutral-400">Sem lançamentos.</p>
          )}
        </Panel>
      </div>

      <Panel title="Notas fiscais" icon={<Receipt size={15} />} accent={PAL.blue} className="mt-4">
        <DataTable
          columns={[
            { key: "number", label: "Nota" },
            { key: "issue", label: "Emissão" },
            { key: "due", label: "Vencimento" },
            { key: "gross", label: "Bruto", align: "right" },
            { key: "net", label: "Líquido", align: "right" },
            { key: "status", label: "Status" },
          ]}
          rows={c.invoices.map((i) => ({
            number: i.number,
            issue: i.issueDate,
            due: i.dueDate,
            gross: fmtMoney(i.gross, i.currency),
            net: fmtMoney(i.net, i.currency),
            status: <Badge tone={statusTone(i.status)}>{i.status}</Badge>,
          }))}
        />
      </Panel>
    </div>
  );
}
