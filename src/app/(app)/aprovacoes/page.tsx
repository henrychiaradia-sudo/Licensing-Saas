import Link from "next/link";
import { ClipboardCheck, Clock, Coins, Layers, ArrowRight } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listPendingApprovals, approvalKpis, listApprovalTiers } from "@/lib/data/approvals";
import { Card, Badge, StatCard } from "@/components/ui";
import { fmtBRL, fmtCompactBRL, fmtDate } from "@/lib/utils";
import { ApproveRow } from "./approve-row";

export default async function AprovacoesPage() {
  const session = await requireSession();
  const [pending, kpis, tiers] = await Promise.all([
    listPendingApprovals(session.tenantId),
    approvalKpis(session.tenantId),
    listApprovalTiers(session.tenantId),
  ]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <ClipboardCheck size={20} className="text-blue-600" /> Aprovações de Compras
        </h1>
        <p className="text-sm text-neutral-500">
          Fila de requisições aguardando aprovação por alçada (fluxo por nível de valor)
        </p>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pendentes de aprovação"
          value={String(kpis.pendingCount)}
          hint="Requisições na fila"
          icon={<Clock size={20} />}
          tone="amber"
        />
        <StatCard
          label="Valor em aprovação"
          value={fmtCompactBRL(kpis.totalValue)}
          hint="Estimativa acumulada"
          icon={<Coins size={20} />}
          tone="blue"
        />
        <StatCard
          label="Níveis de alçada"
          value={String(tiers.length)}
          hint="Matriz configurada"
          icon={<Layers size={20} />}
          tone="violet"
        />
      </div>

      {/* Matriz de alçadas */}
      <Card className="mb-5 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Layers size={16} className="text-blue-500" /> Matriz de alçadas
        </h2>
        <p className="mb-3 text-xs text-neutral-500">
          Cada nível passa a ser exigido a partir do valor indicado (cumulativo). Uma compra percorre
          todos os níveis exigidos, em sequência.
        </p>
        <div className="flex flex-wrap items-stretch gap-2">
          {tiers.map((t, i) => (
            <div key={t.id} className="flex items-center gap-2">
              <div className="rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-600 text-xs text-white">
                    {t.sequence}
                  </span>
                  {t.label}
                </div>
                <div className="mt-1 text-[11px] text-neutral-400">
                  a partir de {fmtBRL(Number(t.threshold))}
                </div>
              </div>
              {i < tiers.length - 1 && <ArrowRight size={16} className="text-neutral-300" />}
            </div>
          ))}
        </div>
      </Card>

      {/* Fila */}
      <Card className="p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Fila de aprovação</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                <th scope="col" className="px-5 py-2 font-medium">Requisição</th>
                <th scope="col" className="px-5 py-2 font-medium">Solicitante</th>
                <th scope="col" className="px-5 py-2 text-right font-medium">Estimativa</th>
                <th scope="col" className="px-5 py-2 font-medium">Nível atual</th>
                <th scope="col" className="px-5 py-2 text-right font-medium">Necessário</th>
                <th scope="col" className="px-5 py-2 text-right font-medium">Ação</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((p) => (
                <tr key={p.reqId} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-5 py-3">
                    <Link
                      href={`/requisicoes/${p.reqId}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {p.requisitionNumber}
                    </Link>
                    <div className="text-xs text-neutral-400">{p.title}</div>
                  </td>
                  <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">
                    {p.requesterName ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">
                    {fmtBRL(p.estimatedTotal)}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone="warn">{p.currentTier}</Badge>
                    <div className="mt-0.5 text-[11px] text-neutral-400">
                      nível {p.currentSeq} de {p.totalSteps}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-neutral-500">
                    {fmtDate(p.neededBy)}
                  </td>
                  <td className="px-5 py-3">
                    <ApproveRow reqId={p.reqId} />
                  </td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-neutral-400">
                    Nenhuma requisição aguardando aprovação.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
