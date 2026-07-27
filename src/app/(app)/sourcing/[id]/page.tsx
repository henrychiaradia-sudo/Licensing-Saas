import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Award, ShoppingCart, Scale, Handshake, Trophy } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getSourcingEventDetail, equalizeQuotes, listNegotiationsForEvent } from "@/lib/data/sourcing";
import { listSupplierOptions } from "@/lib/data/purchase-orders";
import { awardQuoteAction, generatePoAction } from "../actions";
import { QuoteForm } from "../quote-form";
import { WeightsForm } from "../weights-form";
import { NegotiationForm } from "../negotiation-form";
import { Card, Badge, Button } from "@/components/ui";
import { fmtMoney, fmtDate } from "@/lib/utils";
import type { SourcingStatus } from "@/lib/db/schema";

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

export default async function SourcingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const [data, suppliers, negotiations] = await Promise.all([
    getSourcingEventDetail(session.tenantId, id),
    listSupplierOptions(session.tenantId),
    listNegotiationsForEvent(session.tenantId, id),
  ]);
  if (!data) notFound();
  const { event: e, quotes } = data;

  const weights = {
    price: e.weightPrice,
    lead: e.weightLead,
    quality: e.weightQuality,
    payment: e.weightPayment,
  };
  const { rows: eq, bestId } = equalizeQuotes(weights, quotes);
  const cheapestLanded = eq.length ? Math.min(...eq.map((r) => r.landed)) : null;

  const open = e.status !== "adjudicado" && e.status !== "cancelado";
  const awarded = quotes.find((q) => q.isAwarded) ?? null;
  const iso = quotes[0]?.currencyIso ?? "BRL";

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
          <h1 className="text-xl font-bold">{e.title}</h1>
          <p className="text-sm text-neutral-500">
            {e.categoryName ? `${e.categoryName} · ` : ""}Prazo: {fmtDate(e.dueDate)} · {quotes.length}{" "}
            cotação(ões)
          </p>
        </div>
        <Badge tone={statusTone[e.status]}>{statusLabel[e.status]}</Badge>
      </div>

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
          Ajuste a importância de cada critério (%). A nota ponderada e o ranking recalculam na hora.
        </p>
        <WeightsForm eventId={e.id} weights={weights} />
      </Card>

      <Card className="overflow-x-auto p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Mapa de equalização</h2>
          <p className="text-xs text-neutral-500">
            Custo total = valor + frete + impostos + outros. Nota ponderada de 0 a 100 (melhor por
            critério = 100). O 1º colocado pode não ser o mais barato.
          </p>
        </div>
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-4 py-2 font-medium">#</th>
              <th className="px-4 py-2 font-medium">Fornecedor</th>
              <th className="px-4 py-2 text-right font-medium">Custo total</th>
              <th className="px-4 py-2 text-right font-medium">Prazo</th>
              <th className="px-4 py-2 text-right font-medium">Qual.</th>
              <th className="px-4 py-2 text-right font-medium">Pagto</th>
              <th className="px-4 py-2 text-right font-medium">Nota ponderada</th>
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
                    <div className="text-[11px] text-neutral-400">base {fmtMoney(q.amount, q.currencyIso ?? "BRL")}</div>
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {q.leadTimeDays != null ? `${q.leadTimeDays} d` : "—"}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums">
                    {q.score != null ? Number(q.score).toFixed(1).replace(".", ",") : "—"}
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
                <td colSpan={8} className="px-5 py-8 text-center text-sm text-neutral-400">
                  Nenhuma proposta registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

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
              const reduction =
                first != null ? Number(first.amount) - Number(q.amount) : null;
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
                          <span className="tabular-nums">{fmtMoney(r.amount, q.currencyIso ?? "BRL")}</span>
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
    </div>
  );
}
