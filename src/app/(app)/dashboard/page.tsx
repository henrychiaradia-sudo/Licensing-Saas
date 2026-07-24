import { requireSession } from "@/lib/auth";
import { countLicensees } from "@/lib/data/licensees";
import { countActiveContracts } from "@/lib/data/contracts";
import { royaltiesCompetencia } from "@/lib/data/royalties";
import { mgRealizedPercent } from "@/lib/data/finance";
import { Card } from "@/components/ui";
import { fmtCompactBRL, fmtPct } from "@/lib/utils";
import { Users, FileText, Coins, TrendingUp, type LucideIcon } from "lucide-react";

export default async function DashboardPage() {
  const session = await requireSession();
  const [licensees, activeContracts, royalties, mgPct] = await Promise.all([
    countLicensees(session.tenantId),
    countActiveContracts(session.tenantId),
    royaltiesCompetencia(session.tenantId),
    mgRealizedPercent(session.tenantId),
  ]);

  const kpis: { label: string; value: string; icon: LucideIcon; tone: string }[] = [
    { label: "Licenciados ativos", value: String(licensees), icon: Users, tone: "text-blue-600" },
    { label: "Contratos vigentes", value: String(activeContracts), icon: FileText, tone: "text-emerald-600" },
    { label: "Royalties (competência)", value: fmtCompactBRL(royalties), icon: Coins, tone: "text-amber-600" },
    { label: "MG realizado", value: fmtPct(mgPct), icon: TrendingUp, tone: "text-violet-600" },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold">Dashboard Executivo</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Bem-vindo, {session.name.split(" ")[0]} · indicadores lidos do Supabase em tempo real.
      </p>

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
        <h2 className="text-sm font-semibold">Fases 1–3 no ar</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Autenticação, multi-tenant e RBAC/ABAC (Fase 1), Marcas, Produtos e Biblioteca (Fase 2) e agora
          Contratos, Royalties e Financeiro (Fase 3) — todos ligados ao Supabase. Os quatro indicadores acima
          são leituras reais do banco: licenciados ativos, contratos vigentes, royalties da competência mais
          recente e o percentual da garantia mínima já coberto pelos royalties.
        </p>
      </Card>
    </div>
  );
}
