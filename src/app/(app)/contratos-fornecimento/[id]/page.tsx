import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Pause, RefreshCw, CheckCircle2 } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getSupplyContractDetail } from "@/lib/data/supply-contracts";
import { setSupplyContractStatusAction } from "../actions";
import { supplyStatusTone, supplyStatusLabel } from "../page";
import { Card, Badge, Button } from "@/components/ui";
import { fmtMoney, fmtDate } from "@/lib/utils";
import type { SupplyContractStatus } from "@/lib/db/schema";

const STATUS_ACTIONS: Record<
  SupplyContractStatus,
  { value: SupplyContractStatus; label: string; icon: React.ReactNode; variant?: "primary" | "outline" | "danger" }[]
> = {
  rascunho: [{ value: "vigente", label: "Ativar (vigente)", icon: <Play size={14} /> }],
  vigente: [
    { value: "suspenso", label: "Suspender", icon: <Pause size={14} />, variant: "outline" },
    { value: "renovado", label: "Renovar", icon: <RefreshCw size={14} /> },
    { value: "encerrado", label: "Encerrar", icon: <CheckCircle2 size={14} />, variant: "danger" },
  ],
  suspenso: [
    { value: "vigente", label: "Retomar", icon: <Play size={14} /> },
    { value: "encerrado", label: "Encerrar", icon: <CheckCircle2 size={14} />, variant: "danger" },
  ],
  renovado: [
    { value: "encerrado", label: "Encerrar", icon: <CheckCircle2 size={14} />, variant: "danger" },
  ],
  encerrado: [],
};

export default async function SupplyContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const c = await getSupplyContractDetail(session.tenantId, id);
  if (!c) notFound();
  const status = c.status as SupplyContractStatus;
  const nextActions = STATUS_ACTIONS[status];

  return (
    <div>
      <Link
        href="/contratos-fornecimento"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Contratos de Fornecimento
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{c.title}</h1>
          <p className="text-sm text-neutral-500">
            {c.contractNumber}
            {c.supplierName ? ` · ${c.supplierName}` : ""}
            {c.supplierCode ? ` (${c.supplierCode})` : ""}
          </p>
        </div>
        <Badge tone={supplyStatusTone[status]}>{supplyStatusLabel[status]}</Badge>
      </div>

      {nextActions.length > 0 && (
        <Card className="mb-4 flex flex-wrap items-center gap-2 p-4">
          <span className="mr-2 text-sm text-neutral-500">Mudar status:</span>
          {nextActions.map((a) => (
            <form key={a.value} action={setSupplyContractStatusAction.bind(null, c.id)}>
              <input type="hidden" name="status" value={a.value} />
              <Button type="submit" size="sm" variant={a.variant ?? "primary"}>
                {a.icon} {a.label}
              </Button>
            </form>
          ))}
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Dados do contrato</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Field label="Fornecedor" value={c.supplierName} />
            <Field label="Categoria" value={c.categoryName} />
            <Field label="Condição de pagamento" value={c.paymentTerms} />
            <Field
              label="Vigência"
              value={c.startDate ? `${fmtDate(c.startDate)} → ${fmtDate(c.endDate)}` : "—"}
            />
            <Field label="Renovação automática" value={c.autoRenew ? "Sim" : "Não"} />
          </dl>
          {c.sla && (
            <div className="mt-4 border-t border-neutral-100 pt-3 text-sm dark:border-neutral-800">
              <span className="text-xs text-neutral-400">SLA / nível de serviço</span>
              <p className="font-medium">{c.sla}</p>
            </div>
          )}
          {c.notes && (
            <p className="mt-3 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-500 dark:bg-neutral-800/50">
              {c.notes}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <div className="text-xs font-medium text-neutral-500">Valor total do contrato</div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{fmtMoney(c.totalValue, c.currency)}</div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Moeda</span>
              <span className="font-medium">{c.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Status</span>
              <Badge tone={supplyStatusTone[status]}>{supplyStatusLabel[status]}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Renovação</span>
              <span className="font-medium">{c.autoRenew ? "Automática" : "Manual"}</span>
            </div>
          </div>
        </Card>
      </div>
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
