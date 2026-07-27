import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Pencil, CheckCircle2, Ban, Gauge, ShieldAlert } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getSupplierDetail } from "@/lib/data/suppliers";
import { computeSupplierPerformance, listEvaluations } from "@/lib/data/evaluations";
import { setSupplierStatusAction } from "../actions";
import { EvaluationForm } from "../evaluation-form";
import { Card, Badge, Button } from "@/components/ui";
import { fmtMoney, fmtDate } from "@/lib/utils";
import { categoryLabel } from "../page";
import type { SupplierStatus, PoStatus, SupplierRiskLevel } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

const riskTone: Record<SupplierRiskLevel, Tone> = {
  baixo: "good",
  medio: "info",
  alto: "warn",
  critico: "danger",
};
const riskLabel: Record<SupplierRiskLevel, string> = {
  baixo: "Risco baixo",
  medio: "Risco médio",
  alto: "Risco alto",
  critico: "Risco crítico",
};

const statusTone: Record<SupplierStatus, Tone> = {
  em_homologacao: "warn",
  ativo: "good",
  inativo: "neutral",
  bloqueado: "danger",
};
const statusLabel: Record<SupplierStatus, string> = {
  em_homologacao: "Em homologação",
  ativo: "Ativo",
  inativo: "Inativo",
  bloqueado: "Bloqueado",
};
const poTone: Record<PoStatus, Tone> = {
  rascunho: "neutral",
  enviado: "info",
  confirmado: "info",
  em_producao: "warn",
  embarcado: "warn",
  recebido: "good",
  cancelado: "danger",
};
const poLabel: Record<PoStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  confirmado: "Confirmado",
  em_producao: "Em produção",
  embarcado: "Embarcado",
  recebido: "Recebido",
  cancelado: "Cancelado",
};

export default async function FornecedorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getSupplierDetail(session.tenantId, id);
  if (!data) notFound();
  const { supplier: s, orders } = data;
  const [perf, evaluations] = await Promise.all([
    computeSupplierPerformance(session.tenantId, id),
    listEvaluations(session.tenantId, id),
  ]);
  const latestEval = evaluations[0] ?? null;

  return (
    <div>
      <Link
        href="/fornecedores"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Fornecedores
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{s.tradeName ?? s.legalName}</h1>
          <p className="text-sm text-neutral-500">
            {s.legalName} · {s.code} · {categoryLabel[s.category]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {latestEval && <Badge tone={riskTone[latestEval.riskLevel]}>{riskLabel[latestEval.riskLevel]}</Badge>}
          <Badge tone={statusTone[s.status]}>{statusLabel[s.status]}</Badge>
          <Link href={`/fornecedores/${id}/editar`}>
            <Button variant="outline" size="sm">
              <Pencil size={14} /> Editar
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Homologação — gerencie a situação cadastral do fornecedor.
        </p>
        <div className="flex flex-wrap gap-2">
          {s.status === "em_homologacao" && (
            <form action={setSupplierStatusAction.bind(null, id, "ativo")}>
              <Button type="submit" size="sm">
                <CheckCircle2 size={14} /> Homologar
              </Button>
            </form>
          )}
          {s.status === "ativo" && (
            <form action={setSupplierStatusAction.bind(null, id, "inativo")}>
              <Button type="submit" size="sm" variant="outline">
                Inativar
              </Button>
            </form>
          )}
          {(s.status === "inativo" || s.status === "bloqueado") && (
            <form action={setSupplierStatusAction.bind(null, id, "ativo")}>
              <Button type="submit" size="sm">
                <CheckCircle2 size={14} /> Reativar
              </Button>
            </form>
          )}
          {s.status !== "bloqueado" && (
            <form action={setSupplierStatusAction.bind(null, id, "bloqueado")}>
              <Button type="submit" size="sm" variant="danger">
                <Ban size={14} /> Bloquear
              </Button>
            </form>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Cadastro</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Field label="Local" value={[s.city, s.countryName].filter(Boolean).join(" · ") || "—"} />
            <Field label="Lead time" value={s.leadTimeDays != null ? `${s.leadTimeDays} dias` : "—"} />
            <Field label="Pagamento" value={s.paymentTerms} />
            <Field
              label="Avaliação"
              value={s.rating != null ? `${Number(s.rating).toFixed(1).replace(".", ",")} / 5` : "—"}
            />
          </dl>
          <div className="mt-4 flex flex-wrap gap-4 border-t border-neutral-100 pt-3 text-sm dark:border-neutral-800">
            {s.email && (
              <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                <Mail size={14} /> {s.email}
              </span>
            )}
            {s.phone && (
              <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                <Phone size={14} /> {s.phone}
              </span>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Gauge size={15} className="text-blue-500" /> Performance (dados reais)
          </h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Metric
              label="Aprovação qualidade"
              value={perf.approvalRate != null ? `${perf.approvalRate}%` : "—"}
              hint={`${perf.inspections} inspeç.`}
            />
            <Metric
              label="Entrega no prazo"
              value={perf.onTimeRate != null ? `${perf.onTimeRate}%` : "—"}
              hint={`${perf.ordersReceived} receb.`}
            />
            <Metric label="Gasto comprometido" value={fmtMoney(perf.committedSpend)} hint={`${perf.poCount} pedido(s)`} />
            <Metric
              label="NCs abertas"
              value={String(perf.openNc)}
              tone={perf.openNc > 0 ? "danger" : undefined}
            />
          </dl>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert size={16} className="text-amber-500" /> Scorecard &amp; risco
          </h2>
          {latestEval && (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <span>
                Última ({latestEval.periodLabel}): <strong>{latestEval.overallScore}</strong>/100
              </span>
              <Badge tone={riskTone[latestEval.riskLevel]}>{riskLabel[latestEval.riskLevel]}</Badge>
            </div>
          )}
        </div>

        {evaluations.length > 0 ? (
          <div className="mb-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th className="px-3 py-2 font-medium">Período</th>
                  <th className="px-3 py-2 text-right font-medium">Qual.</th>
                  <th className="px-3 py-2 text-right font-medium">Entr.</th>
                  <th className="px-3 py-2 text-right font-medium">Custo</th>
                  <th className="px-3 py-2 text-right font-medium">Conf.</th>
                  <th className="px-3 py-2 text-right font-medium">Geral</th>
                  <th className="px-3 py-2 font-medium">Risco</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((e) => (
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
        ) : (
          <p className="mb-5 text-sm text-neutral-400">Nenhuma avaliação registrada ainda.</p>
        )}

        <div className="border-t border-neutral-100 pt-4 dark:border-neutral-800">
          <h3 className="mb-3 text-sm font-semibold">Nova avaliação</h3>
          <EvaluationForm supplierId={id} />
        </div>
      </Card>

      <Card className="mt-4 overflow-x-auto p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Pedidos de compra</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-2 font-medium">Pedido</th>
              <th className="px-5 py-2 font-medium">Data</th>
              <th className="px-5 py-2 font-medium">Previsão</th>
              <th className="px-5 py-2 text-right font-medium">Valor</th>
              <th className="px-5 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="px-5 py-2">
                  <Link href={`/compras/${o.id}`} className="font-medium text-blue-600 hover:underline">
                    {o.poNumber}
                  </Link>
                </td>
                <td className="px-5 py-2 tabular-nums">{fmtDate(o.orderDate)}</td>
                <td className="px-5 py-2 tabular-nums">{fmtDate(o.expectedDate)}</td>
                <td className="px-5 py-2 text-right tabular-nums">{fmtMoney(o.totalAmount)}</td>
                <td className="px-5 py-2">
                  <Badge tone={poTone[o.status]}>{poLabel[o.status]}</Badge>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-neutral-400">
                  Nenhum pedido de compra.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className={`text-lg font-bold tabular-nums ${tone === "danger" ? "text-red-600" : ""}`}>
        {value}
      </dd>
      {hint && <div className="text-[11px] text-neutral-400">{hint}</div>}
    </div>
  );
}
