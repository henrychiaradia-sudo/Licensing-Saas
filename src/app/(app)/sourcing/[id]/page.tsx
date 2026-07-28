import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  ShoppingCart,
  Scale,
  Handshake,
  Trophy,
  Target,
  ClipboardList,
  CheckCircle2,
  ShieldCheck,
  MessageSquare,
  Paperclip,
  FilePlus2,
  Activity,
  ExternalLink,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import {
  getSourcingEventDetail,
  equalizeQuotes,
  listNegotiationsForEvent,
  listSourcingActivities,
} from "@/lib/data/sourcing";
import { listSupplierOptions } from "@/lib/data/purchase-orders";
import { awardQuoteAction, generatePoAction, approveEventAction } from "../actions";
import { QuoteForm } from "../quote-form";
import { WeightsForm } from "../weights-form";
import { NegotiationForm } from "../negotiation-form";
import { CommentForm } from "../comment-form";
import { Card, Badge, Button } from "@/components/ui";
import { fmtMoney, fmtDate } from "@/lib/utils";
import type { SourcingStatus, SourcingProcessType, SourcingActivityType } from "@/lib/db/schema";
import { PROCESS_LABEL, PROCESS_TONE, PROCESS_FULL } from "../process-meta";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

const statusTone: Record<SourcingStatus, Tone> = {
  aberto: "info",
  em_analise: "warn",
  adjudicado: "good",
  cancelado: "neutral",
};
const statusLabel: Record<SourcingStatus, string> = {
  aberto: "Aberto",
  em_analise: "Em análise",
  adjudicado: "Adjudicado",
  cancelado: "Cancelado",
};

const ACT_META: Record<
  SourcingActivityType,
  { icon: typeof Activity; className: string }
> = {
  created: { icon: FilePlus2, className: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800" },
  quote: { icon: ClipboardList, className: "bg-blue-100 text-blue-600 dark:bg-blue-950/60" },
  negotiation: { icon: Handshake, className: "bg-amber-100 text-amber-600 dark:bg-amber-950/60" },
  award: { icon: Award, className: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60" },
  approval: { icon: ShieldCheck, className: "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60" },
  comment: { icon: MessageSquare, className: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800" },
  attachment: { icon: Paperclip, className: "bg-blue-100 text-blue-600 dark:bg-blue-950/60" },
  status: { icon: Activity, className: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800" },
};

function TechCell({ value, max }: { value: number | string | null; max: number }) {
  if (value == null || value === "") return <span className="text-neutral-300">—</span>;
  const n = Number(value);
  const pct = Math.max(0, Math.min(100, (n / max) * 100));
  const tone = pct >= 80 ? "text-emerald-600" : pct >= 50 ? "text-amber-600" : "text-red-500";
  return (
    <span className={`font-medium tabular-nums ${tone}`}>
      {max === 5 ? n.toFixed(1).replace(".", ",") : Math.round(n)}
    </span>
  );
}

export default async function SourcingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const [data, suppliers, negotiations, activities] = await Promise.all([
    getSourcingEventDetail(session.tenantId, id),
    listSupplierOptions(session.tenantId),
    listNegotiationsForEvent(session.tenantId, id),
    listSourcingActivities(session.tenantId, id),
  ]);
  if (!data) notFound();
  const { event: e, quotes } = data;
  const pt = e.processType as SourcingProcessType;

  const weights = {
    price: e.weightPrice,
    lead: e.weightLead,
    quality: e.weightQuality,
    payment: e.weightPayment,
    capacity: e.weightCapacity,
    compliance: e.weightCompliance,
    performance: e.weightPerformance,
  };
  const { rows: eq, bestId } = equalizeQuotes(weights, quotes);
  const cheapestLanded = eq.length ? Math.min(...eq.map((r) => r.landed)) : null;

  const open = e.status !== "adjudicado" && e.status !== "cancelado";
  const awarded = quotes.find((q) => q.isAwarded) ?? null;
  const attachments = quotes.filter((q) => q.attachmentUrl);

  return (
    <div>
      <Link
        href="/sourcing"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Sourcing &amp; Cotações
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge tone={PROCESS_TONE[pt]}>{PROCESS_LABEL[pt]}</Badge>
            <h1 className="text-xl font-bold">{e.title}</h1>
          </div>
          <p className="mt-1 text-sm text-neutral-500">
            {e.categoryName ? `${e.categoryName} · ` : ""}Prazo: {fmtDate(e.dueDate)} · {quotes.length}{" "}
            proposta(s)
          </p>
          <p className="text-[11px] text-neutral-400">{PROCESS_FULL[pt]}</p>
        </div>
        <div className="flex items-center gap-2">
          {e.approvedAt && (
            <Badge tone="good">
              <ShieldCheck size={12} /> Aprovado
            </Badge>
          )}
          <Badge tone={statusTone[e.status]}>{statusLabel[e.status]}</Badge>
        </div>
      </div>

      {(e.objective || e.scope) && (
        <Card className="mb-4 grid gap-4 p-5 sm:grid-cols-2">
          {e.objective && (
            <div>
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <Target size={15} className="text-blue-500" /> Objetivo
              </h2>
              <p className="whitespace-pre-line text-sm text-neutral-600 dark:text-neutral-300">
                {e.objective}
              </p>
            </div>
          )}
          {e.scope && (
            <div>
              <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                <ClipboardList size={15} className="text-blue-500" />{" "}
                {pt === "rfi" ? "Questionário técnico" : pt === "rfp" ? "Escopo do projeto" : "Escopo"}
              </h2>
              <p className="whitespace-pre-line text-sm text-neutral-600 dark:text-neutral-300">
                {e.scope}
              </p>
            </div>
          )}
        </Card>
      )}

      {e.status === "adjudicado" && awarded && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="flex items-center gap-2 text-sm text-emerald-800 dark:text-emerald-300">
            <Award size={16} className="shrink-0 text-emerald-600" />
            Adjudicado a <strong>{awarded.supplierName}</strong> por{" "}
            {fmtMoney(awarded.amount, awarded.currencyIso ?? "BRL")}.
          </p>
          <form action={generatePoAction.bind(null, awarded.id)}>
            <Button type="submit" size="sm">
              <ShoppingCart size={14} /> Gerar pedido de compra
            </Button>
          </form>
        </Card>
      )}

      {/* Aprovação (governança) */}
      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck size={16} className={e.approvedAt ? "text-emerald-600" : "text-neutral-400"} />
          {e.approvedAt ? (
            <span className="text-neutral-600 dark:text-neutral-300">
              Seleção <strong className="text-emerald-600">aprovada</strong> em{" "}
              {fmtDate(e.approvedAt)}.
            </span>
          ) : (
            <span className="text-neutral-500">
              Sign-off de governança: aprove a seleção antes de fechar o processo.
            </span>
          )}
        </div>
        {!e.approvedAt && quotes.length > 0 && open && (
          <form action={approveEventAction.bind(null, e.id)}>
            <Button type="submit" variant="outline" size="sm">
              <CheckCircle2 size={14} /> Aprovar seleção
            </Button>
          </form>
        )}
      </Card>

      {open && suppliers.length > 0 && (
        <Card className="mb-4 p-5">
          <h2 className="mb-3 text-sm font-semibold">Registrar proposta</h2>
          <QuoteForm
            eventId={e.id}
            suppliers={suppliers.map((s) => ({
              id: s.id,
              label: `${s.tradeName ?? s.legalName} (${s.code})`,
            }))}
          />
        </Card>
      )}

      <Card className="mb-4 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Scale size={16} className="text-blue-500" /> Pesos de equalização
        </h2>
        <p className="mb-3 text-xs text-neutral-500">
          Ajuste a importância de cada critério. A nota ponderada e o ranking recalculam ao aplicar.
        </p>
        <WeightsForm eventId={e.id} weights={weights} />
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="p-5 pb-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Trophy size={16} className="text-blue-500" /> Comparador inteligente
          </h2>
          <p className="text-xs text-neutral-500">
            Custo total (landed) = valor + frete + impostos + outros. Nota ponderada de 0 a 100 pelos
            pesos do processo. O 1º colocado pode não ser o mais barato.
          </p>
        </div>
        <table className="w-full min-w-[1120px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Fornecedor</th>
              <th className="px-4 py-2 text-right font-medium">Custo total</th>
              <th className="px-4 py-2 text-right font-medium">MOQ</th>
              <th className="px-4 py-2 text-right font-medium">Prazo</th>
              <th className="px-4 py-2 text-right font-medium">Qual.</th>
              <th className="px-4 py-2 text-right font-medium">Capac.</th>
              <th className="px-4 py-2 text-right font-medium">Compl.</th>
              <th className="px-4 py-2 text-right font-medium">Perf.</th>
              <th className="px-4 py-2 text-right font-medium">Técnica</th>
              <th className="px-4 py-2 text-right font-medium">Pagto</th>
              <th className="px-4 py-2 text-right font-medium">Nota</th>
              <th className="px-4 py-2 text-right font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {eq.map((q) => {
              const isCheapest = cheapestLanded !== null && q.landed === cheapestLanded;
              const isBest = q.id === bestId;
              return (
                <tr
                  key={q.id}
                  className={`border-b border-neutral-100 last:border-0 dark:border-neutral-800 ${
                    q.isAwarded ? "bg-emerald-50/60 dark:bg-emerald-950/20" : ""
                  }`}
                >
                  <td className="px-4 py-2">
                    {isBest ? (
                      <Badge tone="good">
                        <Trophy size={11} /> 1º
                      </Badge>
                    ) : (
                      <span className="text-neutral-400">{q.rank}º</span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-medium">
                    {q.supplierName ?? "—"}
                    {q.isAwarded && (
                      <Badge tone="good" className="ml-2">
                        <Award size={11} /> Vencedora
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    <span className={isCheapest ? "font-semibold text-emerald-600" : ""}>
                      {fmtMoney(q.landed, q.currencyIso ?? "BRL")}
                    </span>
                    <div className="text-[11px] text-neutral-400">
                      base {fmtMoney(q.amount, q.currencyIso ?? "BRL")}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-neutral-500">
                    {q.moq != null ? q.moq.toLocaleString("pt-BR") : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {q.leadTimeDays != null ? `${q.leadTimeDays} d` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <TechCell value={q.score} max={5} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <TechCell value={q.capacityScore} max={100} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <TechCell value={q.complianceScore} max={100} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <TechCell value={q.performanceScore} max={100} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="font-semibold tabular-nums text-neutral-700 dark:text-neutral-200">
                      {q.technicalScore}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {q.paymentTermsDays != null ? `${q.paymentTermsDays} d` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={`text-base font-bold tabular-nums ${isBest ? "text-emerald-600" : ""}`}>
                      {q.weightedTotal.toFixed(1).replace(".", ",")}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {open ? (
                      <form action={awardQuoteAction.bind(null, e.id, q.id)}>
                        <Button type="submit" variant="outline" size="sm">
                          <Award size={13} /> Adjudicar
                        </Button>
                      </form>
                    ) : q.isAwarded ? (
                      <span className="text-xs font-medium text-emerald-600">Vencedora</span>
                    ) : (
                      <span className="text-xs text-neutral-400">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {eq.length === 0 && (
              <tr>
                <td colSpan={13} className="px-5 py-8 text-center text-sm text-neutral-400">
                  Nenhuma proposta registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {attachments.length > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Paperclip size={16} className="text-blue-500" /> Anexos das propostas
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {attachments.map((q) => (
              <a
                key={q.id}
                href={q.attachmentUrl ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:border-blue-400 dark:border-neutral-800"
              >
                <span className="font-medium">{q.supplierName ?? "—"}</span>
                <span className="flex items-center gap-1 text-xs text-blue-600">
                  Abrir <ExternalLink size={12} />
                </span>
              </a>
            ))}
          </div>
        </Card>
      )}

      {quotes.length > 0 && (
        <Card className="mt-4 p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <Handshake size={16} className="text-amber-500" /> Negociação
          </h2>
          <p className="mb-4 text-xs text-neutral-500">
            Registre rodadas de negociação. O valor negociado passa a valer na equalização.
          </p>
          <div className="grid gap-4">
            {quotes.map((q) => {
              const rounds = negotiations.filter((n) => n.sourcingQuoteId === q.id);
              const first = rounds[0];
              const reduction = first != null ? Number(first.amount) - Number(q.amount) : null;
              return (
                <div
                  key={q.id}
                  className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{q.supplierName ?? "—"}</span>
                    <span className="text-sm tabular-nums text-neutral-500">
                      Valor atual: <strong>{fmtMoney(q.amount, q.currencyIso ?? "BRL")}</strong>
                      {reduction != null && reduction > 0 && (
                        <span className="ml-2 text-emerald-600">
                          −{fmtMoney(reduction, q.currencyIso ?? "BRL")} vs. inicial
                        </span>
                      )}
                    </span>
                  </div>
                  {rounds.length > 0 && (
                    <ol className="mb-3 space-y-1 text-xs text-neutral-500">
                      {rounds.map((r) => (
                        <li key={r.id} className="flex items-center gap-2">
                          <span className="rounded bg-neutral-100 px-1.5 py-0.5 font-medium dark:bg-neutral-800">
                            Rodada {r.roundNumber}
                          </span>
                          <span className="tabular-nums">
                            {fmtMoney(r.amount, q.currencyIso ?? "BRL")}
                          </span>
                          {r.notes && <span>· {r.notes}</span>}
                        </li>
                      ))}
                    </ol>
                  )}
                  {open && <NegotiationForm eventId={e.id} quoteId={q.id} />}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Timeline / histórico + comentários */}
      <Card className="mt-4 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Activity size={16} className="text-blue-500" /> Histórico do processo
        </h2>
        <p className="mb-4 text-xs text-neutral-500">
          Linha do tempo de criação, propostas, negociações, aprovação e comentários da equipe.
        </p>
        <div className="mb-4">
          <CommentForm eventId={e.id} />
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-neutral-400">Sem atividades registradas.</p>
        ) : (
          <ol className="space-y-3">
            {activities.map((a) => {
              const meta = ACT_META[a.type] ?? ACT_META.status;
              const Icon = meta.icon;
              return (
                <li key={a.id} className="flex gap-3">
                  <div
                    className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${meta.className}`}
                  >
                    <Icon size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-neutral-700 dark:text-neutral-200">{a.description}</p>
                    <p className="text-[11px] text-neutral-400">
                      {a.actorName ? `${a.actorName} · ` : ""}
                      {fmtDate(a.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
