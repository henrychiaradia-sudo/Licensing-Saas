import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bell, FileText, ShieldCheck, Pencil } from "lucide-react";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { getContractDetail, getContractDateAlerts } from "@/lib/data/contracts";
import { getContractRoyaltyRule } from "@/lib/data/royalties";
import { getContractRecoupment } from "@/lib/data/finance";
import { Card, Badge, Button } from "@/components/ui";
import { RoyaltyRuleForm, type RuleFormValues } from "./royalty-rule-form";
import { fmtMoney, fmtDate } from "@/lib/utils";
import type {
  ContractStatus,
  FeeType,
  AlertType,
  AlertStatus,
  ContractDocType,
} from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

const statusTone: Record<ContractStatus, Tone> = {
  rascunho: "neutral",
  em_aprovacao: "info",
  vigente: "good",
  suspenso: "warn",
  renovado: "good",
  expirado: "danger",
  encerrado: "neutral",
};
const statusLabel: Record<ContractStatus, string> = {
  rascunho: "Rascunho",
  em_aprovacao: "Em aprovação",
  vigente: "Vigente",
  suspenso: "Suspenso",
  renovado: "Renovado",
  expirado: "Expirado",
  encerrado: "Encerrado",
};
const feeLabel: Record<FeeType, string> = {
  initial: "Taxa inicial",
  annual: "Anuidade",
  marketing: "Fundo de marketing",
  renewal: "Renovação",
  penalty: "Multa",
  other: "Outros",
};
const alertLabel: Record<AlertType, string> = {
  renovacao: "Renovação",
  vencimento: "Vencimento",
  mg_shortfall: "Shortfall de GM",
  pagamento_vencido: "Pagamento vencido",
  documento_vencido: "Documento vencido",
};
const alertTone: Record<AlertStatus, Tone> = {
  agendado: "info",
  disparado: "warn",
  resolvido: "good",
  ignorado: "neutral",
};
const docLabel: Record<ContractDocType, string> = {
  contrato: "Contrato",
  aditivo: "Aditivo",
  nda: "NDA",
  distrato: "Distrato",
  anexo: "Anexo",
  procuracao: "Procuração",
};

export default async function ContratoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getContractDetail(session.tenantId, id);
  if (!data) notFound();

  const { contract: c, fees, guarantees, territories, brands, alerts, documents } = data;
  const iso = c.currencyIso ?? "BRL";
  const canWrite = can(session, PERMISSIONS.contractWrite);

  const recoup = await getContractRecoupment(session.tenantId, id);
  const dateAlerts = await getContractDateAlerts(session.tenantId, id);
  const { rule, tiers } = await getContractRoyaltyRule(session.tenantId, id);
  const ruleInitial: RuleFormValues = {
    royaltyType: rule?.royaltyType === "escalonado" ? "escalonado" : "percentual",
    base: (rule?.base ?? "net_sales") as RuleFormValues["base"],
    percentage: rule?.percentage != null ? Number(rule.percentage) : "",
    minRoyalty: rule?.minRoyalty != null ? Number(rule.minRoyalty) : "",
    maxRoyalty: rule?.maxRoyalty != null ? Number(rule.maxRoyalty) : "",
    tiers: tiers.map((t) => ({
      tierFrom: Number(t.tierFrom),
      tierTo: t.tierTo == null ? "" : Number(t.tierTo),
      rate: Number(t.rate),
    })),
  };

  return (
    <div>
      <Link
        href="/contratos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Contratos
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{c.contractNumber}</h1>
          <p className="text-sm text-neutral-500">
            {c.licenseeName} · {c.exclusivity === "exclusivo" ? "Exclusivo" : "Não exclusivo"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone[c.status]}>{statusLabel[c.status]}</Badge>
          {canWrite && (
            <Link href={`/contratos/${id}/editar`}>
              <Button variant="outline" size="sm">
                <Pencil size={14} /> Editar
              </Button>
            </Link>
          )}
        </div>
      </div>

      {dateAlerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {dateAlerts.map((a, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
                a.severity === "danger"
                  ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                  : a.severity === "warn"
                    ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
                    : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
              }`}
            >
              <Bell size={15} className="shrink-0" /> {a.label} · {fmtDate(a.date)}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Dados do contrato</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Field label="Início" value={fmtDate(c.startDate)} />
            <Field label="Fim" value={fmtDate(c.endDate)} />
            <Field label="Assinatura" value={fmtDate(c.signingDate)} />
            <Field
              label="Renovação automática"
              value={c.autoRenewal ? `Sim${c.renewalTermMonths ? ` · ${c.renewalTermMonths} meses` : ""}` : "Não"}
            />
            <Field label="Garantia mínima total" value={fmtMoney(c.minimumGuaranteeTotal, iso)} />
            <Field label="Seguro exigido" value={c.insuranceRequired ? "Sim" : "Não"} />
          </dl>
          {c.notes && (
            <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-500 dark:border-neutral-800">
              {c.notes}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck size={15} className="text-emerald-600" /> Marcas licenciadas
          </h2>
          {brands.length ? (
            <ul className="space-y-2 text-sm">
              {brands.map((b) => (
                <li key={b.id} className="flex items-center justify-between">
                  <span>{b.name}</span>
                  <span className="text-xs text-neutral-400">{b.code}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-400">Nenhuma marca vinculada.</p>
          )}
          <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            Territórios
          </h3>
          {territories.length ? (
            <div className="flex flex-wrap gap-1.5">
              {territories.map((t, i) => (
                <span
                  key={i}
                  className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800"
                >
                  {t.name}
                  {t.isExclusive ? " ★" : ""}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-400">Sem territórios definidos.</p>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold">Taxas e obrigações financeiras</h2>
        {fees.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                <th className="py-2 pr-4 font-medium">Tipo</th>
                <th className="py-2 pr-4 font-medium">Vencimento</th>
                <th className="py-2 pr-4 font-medium">Recorrência</th>
                <th className="py-2 pr-4 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((f) => (
                <tr key={f.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="py-2 pr-4">{feeLabel[f.feeType]}</td>
                  <td className="py-2 pr-4 tabular-nums">{fmtDate(f.dueDate)}</td>
                  <td className="py-2 pr-4 text-neutral-500">{f.recurrence ?? "—"}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">
                    {fmtMoney(f.amount, f.currencyIso ?? iso)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-neutral-400">Nenhuma taxa cadastrada.</p>
        )}
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="text-sm font-semibold">Regra de royalties</h2>
        <p className="mb-4 mt-1 text-xs text-neutral-500">
          Configure a alíquota única ou faixas progressivas (com piso/teto). Os próximos reportes deste
          contrato usarão esta regra.
        </p>
        <RoyaltyRuleForm contractId={id} initial={ruleInitial} iso={iso} />
      </Card>

      {recoup.gmTotal > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="mb-1 text-sm font-semibold">Garantia mínima &amp; recoupment</h2>
          <p className="mb-4 text-xs text-neutral-500">
            Os royalties apurados (aprovados) abatem a garantia mínima. O que passar da GM é
            excedente, cobrado além dela.
          </p>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Garantia mínima" value={fmtMoney(recoup.gmTotal, iso)} />
            <Field label="Royalties apurados" value={fmtMoney(recoup.earned, iso)} />
            <Field label="Recuperado" value={fmtMoney(recoup.recouped, iso)} />
            <Field
              label={recoup.surplus > 0 ? "Excedente (acima da GM)" : "Saldo a recuperar"}
              value={fmtMoney(recoup.surplus > 0 ? recoup.surplus : recoup.outstanding, iso)}
            />
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-neutral-500">
              <span>Recoupment da garantia mínima</span>
              <span className="tabular-nums">{recoup.pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${recoup.pct}%` }}
              />
            </div>
            {recoup.surplus > 0 && (
              <p className="mt-2 text-xs text-emerald-600">
                Garantia mínima recuperada — excedente de {fmtMoney(recoup.surplus, iso)} cobrado além
                da GM.
              </p>
            )}
          </div>
        </Card>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Garantias mínimas por período</h2>
          {guarantees.length ? (
            <ul className="space-y-2 text-sm">
              {guarantees.map((g) => (
                <li
                  key={g.id}
                  className="flex items-center justify-between border-b border-neutral-100 pb-2 last:border-0 dark:border-neutral-800"
                >
                  <span className="text-neutral-500">
                    {fmtDate(g.periodStart)} — {fmtDate(g.periodEnd)}
                  </span>
                  <span className="font-medium tabular-nums">
                    {fmtMoney(g.amount, g.currencyIso ?? iso)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-400">Sem garantia mínima cadastrada.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Bell size={15} className="text-amber-500" /> Alertas
          </h2>
          {alerts.length ? (
            <ul className="space-y-2 text-sm">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between">
                  <span>
                    {alertLabel[a.alertType]}
                    <span className="ml-2 text-xs text-neutral-400">{fmtDate(a.triggerDate)}</span>
                  </span>
                  <Badge tone={alertTone[a.status]}>{a.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-400">Nenhum alerta agendado.</p>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <FileText size={15} className="text-blue-600" /> Documentos
        </h2>
        {documents.length ? (
          <ul className="space-y-2 text-sm">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center justify-between">
                <span>
                  <span className="font-medium">{docLabel[d.docType]}</span>
                  <span className="ml-2 text-neutral-500">{d.fileName ?? "—"}</span>
                  <span className="ml-2 text-xs text-neutral-400">v{d.version}</span>
                </span>
                {d.isSigned ? <Badge tone="good">Assinado</Badge> : <Badge tone="neutral">Pendente</Badge>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-neutral-400">Nenhum documento anexado.</p>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="font-medium">{value ?? "—"}</dd>
    </div>
  );
}
