import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { getLicenseeContractsForReport } from "@/lib/data/portal";
import { Card } from "@/components/ui";
import { ReportForm } from "./report-form";

export default async function NovoReporte() {
  const session = await requireLicenseeSession();
  const contracts = await getLicenseeContractsForReport(session.tenantId, session.licenseeId);

  const now = new Date();
  const defaultRef = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  return (
    <div>
      <Link
        href="/portal/royalties"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-emerald-700"
      >
        <ArrowLeft size={15} /> Reportes de Royalties
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-bold">Novo reporte de royalties</h1>
        <p className="text-sm text-neutral-500">
          Informe as vendas da competência. O royalty é calculado pela alíquota do seu contrato.
        </p>
      </div>

      {contracts.length === 0 ? (
        <Card className="p-8 text-center text-sm text-neutral-500">
          Nenhum contrato vigente encontrado para enviar reportes. Fale com o time de licenciamento.
        </Card>
      ) : (
        <ReportForm contracts={contracts} defaultRef={defaultRef} />
      )}
    </div>
  );
}
