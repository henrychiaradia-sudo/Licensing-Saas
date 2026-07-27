import Link from "next/link";
import { Award, Plus, PiggyBank } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listSourcing, sourcingSavings } from "@/lib/data/sourcing";
import { Card, Badge, Button } from "@/components/ui";
import { fmtMoney, fmtBRL, fmtDate } from "@/lib/utils";
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

export default async function SourcingPage() {
  const session = await requireSession();
  const [events, savings] = await Promise.all([
    listSourcing(session.tenantId),
    sourcingSavings(session.tenantId),
  ]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Sourcing &amp; Cotações</h1>
          <p className="text-sm text-neutral-500">
            Eventos de cotação e comparação de propostas de fornecedores
          </p>
        </div>
        <Link href="/sourcing/new">
          <Button>
            <Plus size={16} /> Novo RFQ
          </Button>
        </Link>
      </div>

      {savings.events.length > 0 && (
        <Card className="mb-5 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <PiggyBank size={16} className="text-emerald-500" /> Savings de sourcing
            </h2>
            <div className="text-right">
              <div className="text-lg font-bold tabular-nums text-emerald-600">
                {fmtBRL(savings.totalSavings)}
              </div>
              <div className="text-[11px] text-neutral-400">
                {savings.avgPct}% sobre {fmtBRL(savings.totalBaseline)} de baseline
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            {savings.events.map((s) => (
              <div
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 px-4 py-2 text-sm dark:border-neutral-800"
              >
                <span className="font-medium">{s.title}</span>
                <span className="text-xs text-neutral-400">{s.supplierName ?? "—"}</span>
                <span className="tabular-nums text-neutral-500">
                  {fmtBRL(s.baseline)} → {fmtBRL(s.awarded)}
                </span>
                <Badge tone={s.savings >= 0 ? "good" : "danger"}>
                  {fmtBRL(s.savings)} ({s.savingsPct}%)
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {events.map((e) => {
          const best = e.quotes.reduce<number | null>(
            (min, q) => (min === null ? Number(q.amount) : Math.min(min, Number(q.amount))),
            null,
          );
          return (
            <Card key={e.id} className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-5 dark:border-neutral-800">
                <div>
                  <Link
                    href={`/sourcing/${e.id}`}
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    {e.title}
                  </Link>
                  <p className="text-xs text-neutral-400">
                    Prazo: {fmtDate(e.dueDate)} · {e.quotes.length} cotação(ões)
                  </p>
                </div>
                <Badge tone={statusTone[e.status]}>{statusLabel[e.status]}</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                      <th className="px-5 py-2 font-medium">Fornecedor</th>
                      <th className="px-5 py-2 text-right font-medium">Proposta</th>
                      <th className="px-5 py-2 text-right font-medium">Lead time</th>
                      <th className="px-5 py-2 text-right font-medium">Score</th>
                      <th className="px-5 py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.quotes.map((q) => {
                      const isBest = best !== null && Number(q.amount) === best;
                      return (
                        <tr
                          key={q.id}
                          className={`border-b border-neutral-50 last:border-0 dark:border-neutral-800/50 ${
                            q.isAwarded ? "bg-emerald-50/60 dark:bg-emerald-950/20" : ""
                          }`}
                        >
                          <td className="px-5 py-2 font-medium">{q.supplierName ?? "—"}</td>
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
                          <td className="px-5 py-2">
                            {q.isAwarded && (
                              <Badge tone="good">
                                <Award size={12} /> Vencedora
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {e.quotes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-5 py-6 text-center text-sm text-neutral-400">
                          Sem cotações recebidas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          );
        })}
        {events.length === 0 && (
          <Card className="p-10 text-center text-sm text-neutral-400">
            Nenhum evento de sourcing.
          </Card>
        )}
      </div>
    </div>
  );
}
