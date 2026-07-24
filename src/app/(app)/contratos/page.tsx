import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { listContracts } from "@/lib/data/contracts";
import { Button, Card, Badge, Input } from "@/components/ui";
import { fmtMoney, fmtDate } from "@/lib/utils";
import { CONTRACT_STATUS } from "./schema";
import type { ContractStatus } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

const statusTone: Record<ContractStatus, Tone> = {
  rascunho: "neutral",
  em_aprovacao: "info",
  vigente: "good",
  suspenso: "warn",
  renovado: "good",
  expirado: "danger",
  encerrado: "neutral",
};
const statusLabel: Record<ContractStatus, string> = {
  rascunho: "Rascunho",
  em_aprovacao: "Em aprovação",
  vigente: "Vigente",
  suspenso: "Suspenso",
  renovado: "Renovado",
  expirado: "Expirado",
  encerrado: "Encerrado",
};

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requireSession();
  const { q, status } = await searchParams;
  const statusFilter =
    status && (CONTRACT_STATUS as readonly string[]).includes(status)
      ? (status as ContractStatus)
      : undefined;
  const contracts = await listContracts(session.tenantId, { q, status: statusFilter });
  const canWrite = can(session, PERMISSIONS.contractWrite);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Contratos</h1>
          <p className="text-sm text-neutral-500">
            Licenças, vigências, garantias mínimas e alertas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="info">{contracts.length} contrato(s)</Badge>
          {canWrite && (
            <Link href="/contratos/new">
              <Button>
                <Plus size={16} /> Novo contrato
              </Button>
            </Link>
          )}
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
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Número do contrato ou licenciado"
              className="pl-9"
            />
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
            {CONTRACT_STATUS.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {(q || statusFilter) && (
          <Link href="/contratos" className="text-sm text-neutral-500 hover:underline">
            Limpar
          </Link>
        )}
      </form>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-3 font-medium">Contrato</th>
              <th className="px-5 py-3 font-medium">Licenciado</th>
              <th className="px-5 py-3 font-medium">Vigência</th>
              <th className="px-5 py-3 text-right font-medium">Garantia mínima</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr
                key={c.id}
                className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
              >
                <td className="px-5 py-3">
                  <Link
                    href={`/contratos/${c.id}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {c.contractNumber}
                  </Link>
                  <div className="text-xs text-neutral-400">
                    {c.exclusivity === "exclusivo" ? "Exclusivo" : "Não exclusivo"}
                    {c.autoRenewal ? " · renova auto" : ""}
                  </div>
                </td>
                <td className="px-5 py-3">{c.licenseeName ?? "—"}</td>
                <td className="px-5 py-3 tabular-nums">
                  {fmtDate(c.startDate)} — {fmtDate(c.endDate)}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {fmtMoney(c.minimumGuaranteeTotal, c.currencyIso ?? "BRL")}
                </td>
                <td className="px-5 py-3">
                  <Badge tone={statusTone[c.status]}>{statusLabel[c.status]}</Badge>
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nenhum contrato encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
