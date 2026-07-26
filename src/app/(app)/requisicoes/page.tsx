import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listRequisitions } from "@/lib/data/requisitions";
import { Button, Card, Badge } from "@/components/ui";
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
export const reqStatusLabel: Record<PurchaseRequisitionStatus, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aprovada: "Aprovada",
  reprovada: "Reprovada",
  convertida: "Convertida em pedido",
  cancelada: "Cancelada",
};

export default async function RequisicoesPage() {
  const session = await requireSession();
  const reqs = await listRequisitions(session.tenantId);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Requisições de Compra</h1>
          <p className="text-sm text-neutral-500">
            Solicitação interna → aprovação → pedido de compra
          </p>
        </div>
        <Link href="/requisicoes/new">
          <Button>
            <Plus size={16} /> Nova requisição
          </Button>
        </Link>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-3 font-medium">Requisição</th>
              <th className="px-5 py-3 font-medium">Necessário até</th>
              <th className="px-5 py-3 text-right font-medium">Itens</th>
              <th className="px-5 py-3 text-right font-medium">Estimativa</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {reqs.map((r) => (
              <tr
                key={r.id}
                className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
              >
                <td className="px-5 py-3">
                  <Link
                    href={`/requisicoes/${r.id}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {r.requisitionNumber}
                  </Link>
                  <div className="text-xs text-neutral-400">{r.title}</div>
                </td>
                <td className="px-5 py-3 tabular-nums">{fmtDate(r.neededBy)}</td>
                <td className="px-5 py-3 text-right tabular-nums">{r.itemCount}</td>
                <td className="px-5 py-3 text-right tabular-nums">{fmtBRL(r.estimatedTotal)}</td>
                <td className="px-5 py-3">
                  <Badge tone={statusTone[r.status]}>{reqStatusLabel[r.status]}</Badge>
                </td>
              </tr>
            ))}
            {reqs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nenhuma requisição cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
