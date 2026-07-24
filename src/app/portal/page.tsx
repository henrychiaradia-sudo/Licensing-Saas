import Link from "next/link";
import { FileText, Coins, Wallet, ClipboardList, Send, type LucideIcon } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { getPortalOverview } from "@/lib/data/portal";
import { Card, Button } from "@/components/ui";
import { fmtCompactBRL } from "@/lib/utils";

export default async function PortalHome() {
  const session = await requireLicenseeSession();
  const ov = await getPortalOverview(session.tenantId, session.licenseeId);

  const kpis: { label: string; value: string; icon: LucideIcon; tone: string }[] = [
    { label: "Contratos vigentes", value: String(ov.activeContracts), icon: FileText, tone: "text-blue-600" },
    { label: "Royalties (última competência)", value: fmtCompactBRL(ov.competencia), icon: Coins, tone: "text-amber-600" },
    { label: "A pagar", value: fmtCompactBRL(ov.outstanding), icon: Wallet, tone: "text-red-600" },
    { label: "Reportes pendentes", value: String(ov.pendingReports), icon: ClipboardList, tone: "text-violet-600" },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Bem-vindo, {session.name.split(" ")[0]}</h1>
          <p className="text-sm text-neutral-500">
            Portal do Licenciado · envie reportes e acompanhe seus royalties e pagamentos.
          </p>
        </div>
        <Link href="/portal/royalties/novo">
          <Button>
            <Send size={15} /> Enviar reporte
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500">{k.label}</span>
                <Icon size={18} className={k.tone} />
              </div>
              <div className="mt-3 text-2xl font-bold tabular-nums">{k.value}</div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-semibold">Como funciona</h2>
        <p className="mt-1 text-sm text-neutral-500">
          A cada competência (mês), envie o reporte de vendas dos produtos licenciados. O sistema calcula
          automaticamente o royalty devido pela alíquota do seu contrato e roda validações. Se houver
          divergência, o reporte fica marcado para correção; caso contrário, entra na fila de aprovação e
          faturamento. Você acompanha tudo por aqui — inclusive contratos e pagamentos.
        </p>
        <div className="mt-4">
          <Link href="/portal/royalties/novo">
            <Button variant="outline">
              <Send size={15} /> Enviar reporte de royalties
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
