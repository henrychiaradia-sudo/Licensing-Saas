import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Send, CheckCircle2, XCircle, ShoppingCart, Clock, GitBranch } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getRequisitionDetail } from "@/lib/data/requisitions";
import { listRequisitionSteps, alcadaFor } from "@/lib/data/approvals";
import { listSupplierOptions } from "@/lib/data/purchase-orders";
import { listCurrencyOptions } from "@/lib/data/contracts";
import { submitRequisitionAction, decideRequisitionAction } from "../actions";
import { ConvertForm } from "../convert-form";
import { reqStatusLabel } from "../page";
import { Card, Badge, Button } from "@/components/ui";
import { fmtBRL, fmtDate } from "@/lib/utils";
import type { PurchaseRequisitionStatus } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";
const statusTone: Record<PurchaseRequisitionStatus, Tone> = {
  rascunho: "neutral",
  enviada: "info",
  aprovada: "good",
  reprovada: "danger",
  convertida: "info",
  cancelada: "neutral",
};

export default async function RequisitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const [data, suppliers, currencies, steps] = await Promise.all([
    getRequisitionDetail(session.tenantId, id),
    listSupplierOptions(session.tenantId),
    listCurrencyOptions(),
    listRequisitionSteps(session.tenantId, id),
  ]);
  if (!data) notFound();
  const { requisition: r, items, convertedPoNumber } = data;
  const estTotal = items.reduce(
    (a, it) => a + Number(it.quantity) * Number(it.estimatedUnitPrice),
    0,
  );
  const alcadaLabel = await alcadaFor(session.tenantId, estTotal);
  const currentStep = steps.find((s) => s.status === "pendente") ?? null;

  return (
    <div>
      <Link
        href="/requisicoes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Requisições de Compra
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{r.requisitionNumber}</h1>
          <p className="text-sm text-neutral-500">
            {r.title}
            {r.requesterName ? ` · por ${r.requesterName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="neutral">Alçada: {alcadaLabel}</Badge>
          <Badge tone={statusTone[r.status]}>{reqStatusLabel[r.status]}</Badge>
        </div>
      </div>

      {r.status === "rascunho" && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Requisição em rascunho. Envie para aprovação quando estiver pronta.
          </p>
          <form action={submitRequisitionAction.bind(null, r.id)}>
            <Button type="submit">
              <Send size={15} /> Enviar para aprovação
            </Button>
          </form>
        </Card>
      )}

      {steps.length > 0 && (
        <Card className="mb-4 p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <GitBranch size={16} className="text-blue-500" /> Fluxo de aprovação por alçada
          </h2>
          <p className="mb-4 text-xs text-neutral-500">
            Estimativa de {fmtBRL(estTotal)} — exige aprovação em {steps.length} nível(is), em
            sequência.
          </p>
          <ol className="space-y-2">
            {steps.map((s) => {
              const isCurrent = currentStep?.id === s.id;
              const tone =
                s.status === "aprovada" ? "good" : s.status === "reprovada" ? "danger" : "neutral";
              return (
                <li
                  key={s.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 ${
                    isCurrent
                      ? "border-blue-300 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20"
                      : "border-neutral-200 dark:border-neutral-800"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-neutral-100 text-xs font-semibold dark:bg-neutral-800">
                      {s.sequence}
                    </span>
                    <span className="font-medium">{s.tierLabel}</span>
                    {isCurrent && s.status === "pendente" && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-blue-600">
                        <Clock size={12} /> aguardando
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    {s.status !== "pendente" && (
                      <span className="text-[11px] text-neutral-400">
                        {s.decidedByName ? `${s.decidedByName} · ` : ""}
                        {fmtDate(s.decidedAt)}
                        {s.comment ? ` · ${s.comment}` : ""}
                      </span>
                    )}
                    <Badge tone={tone}>
                      {s.status === "aprovada"
                        ? "Aprovado"
                        : s.status === "reprovada"
                          ? "Reprovado"
                          : "Pendente"}
                    </Badge>
                  </span>
                </li>
              );
            })}
          </ol>

          {r.status === "enviada" && currentStep && (
            <form action={decideRequisitionAction.bind(null, r.id)} className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800">
              <p className="mb-2 text-xs text-neutral-500">
                Parecer do nível <strong>{currentStep.tierLabel}</strong> (nível {currentStep.sequence}{" "}
                de {steps.length}):
              </p>
              <textarea
                name="comment"
                rows={2}
                placeholder="Comentário / parecer (opcional)"
                className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="submit" name="decision" value="aprovada">
                  <CheckCircle2 size={15} /> Aprovar nível
                </Button>
                <Button type="submit" variant="danger" name="decision" value="reprovada">
                  <XCircle size={15} /> Reprovar
                </Button>
              </div>
            </form>
          )}
        </Card>
      )}

      {r.status === "enviada" && steps.length === 0 && (
        <Card className="mb-4 p-5">
          <h2 className="text-sm font-semibold">Aprovação da requisição</h2>
          <p className="mb-3 text-xs text-neutral-500">
            Estimativa de {fmtBRL(estTotal)} · alçada exigida: <strong>{alcadaLabel}</strong>.
            Registre o parecer.
          </p>
          <form action={decideRequisitionAction.bind(null, r.id)}>
            <textarea
              name="comment"
              rows={2}
              placeholder="Comentário / parecer (opcional)"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="submit" name="decision" value="aprovada">
                <CheckCircle2 size={15} /> Aprovar
              </Button>
              <Button type="submit" variant="danger" name="decision" value="reprovada">
                <XCircle size={15} /> Reprovar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {r.status === "reprovada" && (
        <Card className="mb-4 flex items-start gap-3 border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <p className="text-sm text-red-800 dark:text-red-300">
            Requisição reprovada{r.decisionComment ? `: ${r.decisionComment}` : "."}
          </p>
        </Card>
      )}

      {r.status === "aprovada" && (
        <Card className="mb-4 p-5">
          <h2 className="text-sm font-semibold">Requisição aprovada</h2>
          <p className="mb-3 text-xs text-neutral-500">
            {r.decisionComment ? `Parecer: ${r.decisionComment}. ` : ""}Gere o pedido de compra
            escolhendo o fornecedor.
          </p>
          {suppliers.length === 0 ? (
            <p className="text-sm text-neutral-400">Cadastre um fornecedor para gerar o pedido.</p>
          ) : (
            <ConvertForm
              reqId={r.id}
              suppliers={suppliers.map((s) => ({
                id: s.id,
                label: `${s.tradeName ?? s.legalName} (${s.code})`,
              }))}
              currencies={currencies.map((c) => ({ id: c.id, label: `${c.isoCode} — ${c.name}` }))}
            />
          )}
        </Card>
      )}

      {r.status === "convertida" && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300">
            <ShoppingCart size={16} className="shrink-0 text-emerald-600" />
            Convertida no pedido de compra <strong>{convertedPoNumber ?? "—"}</strong>.
          </p>
          {r.convertedPoId && (
            <Link href={`/compras/${r.convertedPoId}`}>
              <Button variant="outline" size="sm">
                Ver pedido
              </Button>
            </Link>
          )}
        </Card>
      )}

      <Card className="p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Field label="Necessário até" value={fmtDate(r.neededBy)} />
          <Field label="Solicitante" value={r.requesterName} />
          <Field label="Decisão em" value={r.decidedAt ? fmtDate(r.decidedAt) : "—"} />
        </dl>
        {r.justification && (
          <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-500 dark:border-neutral-800">
            {r.justification}
          </p>
        )}
      </Card>

      <Card className="mt-4 overflow-x-auto p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Itens solicitados</h2>
        </div>
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th scope="col" className="px-5 py-2 font-medium">Descrição</th>
              <th scope="col" className="px-5 py-2 text-right font-medium">Qtd.</th>
              <th scope="col" className="px-5 py-2 text-right font-medium">Preço est.</th>
              <th scope="col" className="px-5 py-2 text-right font-medium">Estimativa</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="px-5 py-2">
                  <div className="font-medium">{it.description}</div>
                  <div className="text-xs text-neutral-400">{it.sku ?? "—"}</div>
                </td>
                <td className="px-5 py-2 text-right tabular-nums">
                  {Number(it.quantity).toLocaleString("pt-BR")}
                </td>
                <td className="px-5 py-2 text-right tabular-nums">{fmtBRL(Number(it.estimatedUnitPrice))}</td>
                <td className="px-5 py-2 text-right font-medium tabular-nums">
                  {fmtBRL(Number(it.quantity) * Number(it.estimatedUnitPrice))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200 dark:border-neutral-800">
              <td colSpan={3} className="px-5 py-3 text-right text-sm font-semibold">
                Estimativa total
              </td>
              <td className="px-5 py-3 text-right text-sm font-bold tabular-nums">{fmtBRL(estTotal)}</td>
            </tr>
          </tfoot>
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
