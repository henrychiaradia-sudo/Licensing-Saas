import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listContracts } from "@/lib/data/contracts";
import { Card, Badge } from "@/components/ui";
import { fmtMoney, fmtDate } from "@/lib/utils";
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

export default async function ContratosPage() {
  const session = await requireSession();
  const contracts = await listContracts(session.tenantId);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Contratos</h1>
          <p className="text-sm text-neutral-500">
            Licenças, vigências, garantias mínimas e alertas — lido do Supabase
          </p>
        </div>
        <Badge tone="info">{contracts.length} contrato(s)</Badge>
      </div>

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
                  Nenhum contrato cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
