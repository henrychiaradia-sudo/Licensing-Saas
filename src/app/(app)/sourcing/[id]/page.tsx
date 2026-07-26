import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Award, ShoppingCart } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getSourcingEventDetail } from "@/lib/data/sourcing";
import { listSupplierOptions } from "@/lib/data/purchase-orders";
import { awardQuoteAction, generatePoAction } from "../actions";
import { QuoteForm } from "../quote-form";
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
  const [data, suppliers] = await Promise.all([
    getSourcingEventDetail(session.tenantId, id),
    listSupplierOptions(session.tenantId),
  ]);
  if (!data) notFound();
  const { event: e, quotes } = data;

  const best = quotes.reduce<number | null>(
    (min, q) => (min === null ? Number(q.amount) : Math.min(min, Number(q.amount))),
    null,
  );
  const open = e.status !== "adjudicado" && e.status !== "cancelado";
  const awarded = quotes.find((q) => q.isAwarded) ?? null;

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
            {e.categoryName ? `${e.categoryName} · ` : ""}Prazo: {fmtDate(e.dueDate)} ·{" "}
            {quotes.length} cotação(ões)
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

      {open && (
        <Card className="mb-4 p-5">
          <h2 className="mb-3 text-sm font-semibold">Registrar proposta</h2>
          {suppliers.length === 0 ? (
            <p className="text-sm text-neutral-400">Cadastre um fornecedor para registrar propostas.</p>
          ) : (
            <QuoteForm
              eventId={e.id}
              suppliers={suppliers.map((s) => ({
                id: s.id,
                label: `${s.tradeName ?? s.legalName} (${s.code})`,
              }))}
            />
          )}
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Equalização de propostas</h2>
          <p className="text-xs text-neutral-500">Menor preço destacado. Adjudique a proposta vencedora.</p>
        </div>
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-2 font-medium">Fornecedor</th>
              <th className="px-5 py-2 text-right font-medium">Proposta</th>
              <th className="px-5 py-2 text-right font-medium">Lead time</th>
              <th className="px-5 py-2 text-right font-medium">Score</th>
              <th className="px-5 py-2 font-medium">Observações</th>
              <th className="px-5 py-2 text-right font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => {
              const isBest = best !== null && Number(q.amount) === best;
              return (
                <tr
                  key={q.id}
                  className={`border-b border-neutral-100 last:border-0 dark:border-neutral-800 ${
                    q.isAwarded ? "bg-emerald-50/60 dark:bg-emerald-950/20" : ""
                  }`}
                >
                  <td className="px-5 py-2 font-medium">
                    {q.supplierName ?? "—"}
                    {q.isAwarded && (
                      <Badge tone="good" className="ml-2">
                        <Award size={11} /> Vencedora
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums">
                    <span className={isBest ? "font-semibold text-emerald-600" : ""}>
                      {fmtMoney(q.amount, q.currencyIso ?? "BRL")}
                    </span>
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums">
                    {q.leadTimeDays != null ? `${q.leadTimeDays} d` : "—"}
                  </td>
                  <td className="px-5 py-2 text-right tabular-nums">
                    {q.score != null ? Number(q.score).toFixed(1).replace(".", ",") : "—"}
                  </td>
                  <td className="px-5 py-2 text-neutral-500">{q.notes ?? "—"}</td>
                  <td className="px-5 py-2 text-right">
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
            {quotes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-neutral-400">
                  Nenhuma proposta registrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
