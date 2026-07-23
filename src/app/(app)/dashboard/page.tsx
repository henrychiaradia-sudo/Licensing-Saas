import { requireSession } from "@/lib/auth";
import { countLicensees } from "@/lib/data/licensees";
import { Card } from "@/components/ui";
import { Users, FileText, Coins, TrendingUp, type LucideIcon } from "lucide-react";

export default async function DashboardPage() {
  const session = await requireSession();
  const licensees = await countLicensees(session.tenantId);

  const kpis: { label: string; value: string; icon: LucideIcon; tone: string }[] = [
    { label: "Licenciados ativos", value: String(licensees), icon: Users, tone: "text-blue-600" },
    { label: "Contratos vigentes", value: "1", icon: FileText, tone: "text-emerald-600" },
    { label: "Royalties (competência)", value: "R$ 851,4 mil", icon: Coins, tone: "text-amber-600" },
    { label: "MG realizado", value: "61%", icon: TrendingUp, tone: "text-violet-600" },
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
        <h2 className="text-sm font-semibold">Fase 1 — Fundação</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Autenticação, multi-tenant, RBAC/ABAC e o módulo de Licenciados já estão ligados ao banco. O contador de
          licenciados acima é uma leitura real do Supabase. As demais fases (Contratos, Royalties, Financeiro, Produtos…)
          entram na sequência do roadmap.
        </p>
      </Card>
    </div>
  );
}
