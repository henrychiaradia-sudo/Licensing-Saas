import Link from "next/link";
import {
  AlertTriangle,
  FileWarning,
  Clock,
  FileSignature,
  Bell,
  UserCheck,
  ShieldCheck,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getComplianceSignals } from "@/lib/data/compliance";
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

export default async function CompliancePage() {
  const session = await requireSession();
  const s = await getComplianceSignals(session.tenantId);
  const total =
    s.expiringContracts.length +
    s.divergentReports.length +
    s.overdueReceivables.length +
    s.unsignedDocs.length +
    s.pendingAlerts.length +
    s.pendingSuppliers.length;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Compliance &amp; Riscos</h1>
          <p className="text-sm text-neutral-500">
            Painel consolidado de sinais de risco em contratos, royalties, financeiro e fornecedores
          </p>
        </div>
        <Badge tone={total > 0 ? "warn" : "good"}>
          {total > 0 ? `${total} ponto(s) de atenção` : "Sem pendências"}
        </Badge>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat n={s.expiringContracts.length} label="Contratos vencendo" icon={<Clock size={16} className="text-amber-500" />} />
        <Stat n={s.divergentReports.length} label="Royalties divergentes" icon={<FileWarning size={16} className="text-red-500" />} />
        <Stat n={s.overdueReceivables.length} label="Recebíveis vencidos" icon={<AlertTriangle size={16} className="text-red-500" />} />
        <Stat n={s.unsignedDocs.length} label="Docs. não assinados" icon={<FileSignature size={16} className="text-amber-500" />} />
        <Stat n={s.pendingAlerts.length} label="Alertas pendentes" icon={<Bell size={16} className="text-amber-500" />} />
        <Stat n={s.pendingSuppliers.length} label="Forn. em homologação" icon={<UserCheck size={16} className="text-blue-500" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Contratos vencendo (≤120 dias)" empty={s.expiringContracts.length === 0}>
          {s.expiringContracts.map((c) => (
            <Row
              key={c.id}
              href={`/contratos/${c.id}`}
              main={c.contractNumber}
              sub={c.licenseeName ?? "—"}
              right={fmtDate(c.endDate)}
              tone="warn"
            />
          ))}
        </Section>

        <Section title="Relatórios de royalties com divergência" empty={s.divergentReports.length === 0}>
          {s.divergentReports.map((r) => (
            <Row
              key={r.id}
              href={`/royalties/${r.id}`}
              main={`Competência ${r.referenceLabel}`}
              sub={r.licenseeName ?? "—"}
              right={fmtMoney(r.variance, r.currencyIso ?? "BRL")}
              tone="danger"
            />
          ))}
        </Section>

        <Section title="Recebíveis vencidos ou a vencer" empty={s.overdueReceivables.length === 0}>
          {s.overdueReceivables.map((r) => (
            <Row
              key={r.id}
              href="/financeiro"
              main={r.description ?? "Recebível"}
              sub={`${r.licenseeName ?? "—"} · vence ${fmtDate(r.dueDate)}`}
              right={fmtMoney(Number(r.amount) - Number(r.paidAmount), r.currencyIso ?? "BRL")}
              tone="danger"
            />
          ))}
        </Section>

        <Section title="Alertas de contrato pendentes" empty={s.pendingAlerts.length === 0}>
          {s.pendingAlerts.map((a) => (
            <Row
              key={a.id}
              main={alertLabel[a.alertType]}
              sub={a.contractNumber ?? "—"}
              right={fmtDate(a.triggerDate)}
              tone="warn"
            />
          ))}
        </Section>

        <Section title="Fornecedores em homologação" empty={s.pendingSuppliers.length === 0}>
          {s.pendingSuppliers.map((f) => (
            <Row key={f.id} href={`/fornecedores/${f.id}`} main={f.legalName} sub="Aguardando homologação" tone="info" />
          ))}
        </Section>

        <Section title="Documentos não assinados" empty={s.unsignedDocs.length === 0}>
          {s.unsignedDocs.map((d) => (
            <Row key={d.id} main={d.fileName ?? d.docType} sub={d.contractNumber ?? "—"} tone="warn" />
          ))}
        </Section>
      </div>
    </div>
  );
}

function Stat({ n, label, icon }: { n: number; label: string; icon: React.ReactNode }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        {icon}
        <span className={`text-2xl font-bold tabular-nums ${n > 0 ? "" : "text-neutral-300 dark:text-neutral-700"}`}>
          {n}
        </span>
      </div>
      <div className="mt-1 text-[11px] leading-tight text-neutral-500">{label}</div>
    </Card>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck size={15} className="text-neutral-400" /> {title}
      </h2>
      {empty ? (
        <p className="text-sm text-neutral-400">Nenhuma pendência. ✓</p>
      ) : (
        <div className="space-y-1">{children}</div>
      )}
    </Card>
  );
}

function Row({
  href,
  main,
  sub,
  right,
  tone,
}: {
  href?: string;
  main: string;
  sub?: string;
  right?: string;
  tone: "good" | "info" | "neutral" | "warn" | "danger";
}) {
  const dot = {
    good: "bg-emerald-500",
    info: "bg-blue-500",
    neutral: "bg-neutral-400",
    warn: "bg-amber-500",
    danger: "bg-red-500",
  }[tone];
  const inner = (
    <div className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{main}</div>
          {sub && <div className="truncate text-xs text-neutral-400">{sub}</div>}
        </div>
      </div>
      {right && <span className="shrink-0 text-sm font-medium tabular-nums">{right}</span>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
