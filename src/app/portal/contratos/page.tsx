import { requireLicenseeSession } from "@/lib/auth";
import { listPortalContracts } from "@/lib/data/portal";
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

export default async function PortalContratos() {
  const session = await requireLicenseeSession();
  const contracts = await listPortalContracts(session.tenantId, session.licenseeId);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Meus Contratos</h1>
        <p className="text-sm text-neutral-500">Contratos de licenciamento vinculados à sua empresa</p>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th scope="col" className="px-5 py-3 font-medium">Contrato</th>
              <th scope="col" className="px-5 py-3 font-medium">Vigência</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Garantia mínima</th>
              <th scope="col" className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr key={c.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="px-5 py-3">
                  <div className="font-semibold">{c.contractNumber}</div>
                  <div className="text-xs text-neutral-400">
                    {c.exclusivity === "exclusivo" ? "Exclusivo" : "Não exclusivo"}
                  </div>
                </td>
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
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nenhum contrato vinculado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
