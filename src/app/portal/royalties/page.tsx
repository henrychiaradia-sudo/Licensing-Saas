import Link from "next/link";
import { Send } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { listPortalReports } from "@/lib/data/portal";
import { Card, Badge, Button } from "@/components/ui";
import { fmtMoney } from "@/lib/utils";
import type { RoyaltyReportStatus } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";
const statusTone: Record<RoyaltyReportStatus, Tone> = {
  rascunho: "neutral",
  enviado: "info",
  em_validacao: "info",
  com_divergencia: "warn",
  aprovado: "good",
  rejeitado: "danger",
};
const statusLabel: Record<RoyaltyReportStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  em_validacao: "Em validação",
  com_divergencia: "Com divergência",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};

export default async function PortalRoyalties() {
  const session = await requireLicenseeSession();
  const reports = await listPortalReports(session.tenantId, session.licenseeId);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Reportes de Royalties</h1>
          <p className="text-sm text-neutral-500">Envie o reporte de cada competência e acompanhe o status</p>
        </div>
        <Link href="/portal/royalties/novo">
          <Button>
            <Send size={15} /> Novo reporte
          </Button>
        </Link>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-3 font-medium">Competência</th>
              <th className="px-5 py-3 font-medium">Contrato</th>
              <th className="px-5 py-3 text-right font-medium">Vendas líq.</th>
              <th className="px-5 py-3 text-right font-medium">Royalty</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50">
                <td className="px-5 py-3">
                  <Link href={`/portal/royalties/${r.id}`} className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400">
                    {r.referenceLabel}
                  </Link>
                </td>
                <td className="px-5 py-3 text-neutral-500">{r.contractNumber ?? "—"}</td>
                <td className="px-5 py-3 text-right tabular-nums">{fmtMoney(r.netSalesTotal, r.currencyIso ?? "BRL")}</td>
                <td className="px-5 py-3 text-right font-medium tabular-nums">{fmtMoney(r.royaltyCalculated, r.currencyIso ?? "BRL")}</td>
                <td className="px-5 py-3">
                  <Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge>
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Você ainda não enviou nenhum reporte. Clique em “Novo reporte”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
