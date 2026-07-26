import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listRequisitions } from "@/lib/data/requisitions";
import { Button, Card, Badge, Input } from "@/components/ui";
import { ExportCsvButton } from "@/components/export-csv-button";
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

const STATUS_KEYS = Object.keys(reqStatusLabel) as PurchaseRequisitionStatus[];

export default async function RequisicoesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requireSession();
  const { q, status } = await searchParams;
  const statusFilter =
    status && (STATUS_KEYS as string[]).includes(status)
      ? (status as PurchaseRequisitionStatus)
      : undefined;
  const reqs = await listRequisitions(session.tenantId, { q, status: statusFilter });

  const csvColumns = [
    { key: "numero", label: "Requisição" },
    { key: "titulo", label: "Título" },
    { key: "necessario", label: "Necessário até" },
    { key: "itens", label: "Itens" },
    { key: "estimativa", label: "Estimativa" },
    { key: "status", label: "Status" },
  ];
  const csvRows = reqs.map((r) => ({
    numero: r.requisitionNumber,
    titulo: r.title,
    necessario: r.neededBy ?? "",
    itens: r.itemCount,
    estimativa: r.estimatedTotal,
    status: reqStatusLabel[r.status],
  }));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Requisições de Compra</h1>
          <p className="text-sm text-neutral-500">
            Solicitação interna → aprovação → pedido de compra
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton filename="requisicoes.csv" columns={csvColumns} rows={csvRows} />
          <Link href="/requisicoes/new">
            <Button>
              <Plus size={16} /> Nova requisição
            </Button>
          </Link>
        </div>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Buscar</label>
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <Input name="q" defaultValue={q ?? ""} placeholder="Número ou título" className="pl-9" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Todos</option>
            {STATUS_KEYS.map((s) => (
              <option key={s} value={s}>
                {reqStatusLabel[s]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {(q || statusFilter) && (
          <Link href="/requisicoes" className="text-sm text-neutral-500 hover:underline">
            Limpar
          </Link>
        )}
      </form>

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
