import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { countLicensees } from "@/lib/data/licensees";
import { countActiveContracts } from "@/lib/data/contracts";
import { royaltiesCompetencia } from "@/lib/data/royalties";
import { mgRealizedPercent } from "@/lib/data/finance";
import { Card, StatCard } from "@/components/ui";
import { fmtCompactBRL, fmtPct } from "@/lib/utils";
import {
  Users,
  FileText,
  Coins,
  TrendingUp,
  Target,
  ShoppingCart,
  Microscope,
  BarChart3,
  ArrowRight,
} from "lucide-react";

const shortcuts = [
  { href: "/pipeline", label: "Pipeline (CRM)", icon: Target, tone: "text-blue-600" },
  { href: "/contratos", label: "Contratos", icon: FileText, tone: "text-emerald-600" },
  { href: "/royalties", label: "Royalties", icon: Coins, tone: "text-amber-600" },
  { href: "/compras", label: "Pedidos de Compra", icon: ShoppingCart, tone: "text-violet-600" },
  { href: "/qualidade", label: "Qualidade", icon: Microscope, tone: "text-red-600" },
  { href: "/bi", label: "BI & Analytics", icon: BarChart3, tone: "text-neutral-500" },
];

export default async function DashboardPage() {
  const session = await requireSession();
  const [licensees, activeContracts, royalties, mgPct] = await Promise.all([
    countLicensees(session.tenantId),
    countActiveContracts(session.tenantId),
    royaltiesCompetencia(session.tenantId),
    mgRealizedPercent(session.tenantId),
  ]);

  return (
    <div>
      <h1 className="text-xl font-bold">Dashboard Executivo</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Bem-vindo, {session.name.split(" ")[0]} · indicadores lidos do Supabase em tempo real.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Licenciados ativos"
          value={String(licensees)}
          icon={<Users size={20} />}
          tone="blue"
        />
        <StatCard
          label="Contratos vigentes"
          value={String(activeContracts)}
          icon={<FileText size={20} />}
          tone="emerald"
        />
        <StatCard
          label="Royalties (competência)"
          value={fmtCompactBRL(royalties)}
          icon={<Coins size={20} />}
          tone="amber"
        />
        <StatCard
          label="MG realizado"
          value={fmtPct(mgPct)}
          icon={<TrendingUp size={20} />}
          tone="violet"
        />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-neutral-500">Acesso rápido</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {shortcuts.map(({ href, label, icon: Icon, tone }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-neutral-50 dark:bg-neutral-800">
                <Icon size={18} className={tone} />
              </span>
              <span className="text-sm font-medium">{label}</span>
            </span>
            <ArrowRight size={16} className="text-neutral-300 transition-colors group-hover:text-blue-500" />
          </Link>
        ))}
      </div>

      <Card className="mt-8 p-5">
        <h2 className="text-sm font-semibold">Plataforma completa no ar</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Núcleo (auth, multi-tenant, RBAC), licenciamento (pipeline, contratos, royalties), produtos e
          catálogo, financeiro, suprimentos (fornecedores, compras, sourcing, logística), qualidade,
          jurídico, tarefas, marketing, dois portais externos (licenciado e fornecedor), notificações,
          segurança (2FA) e auditoria forense — tudo ligado ao Supabase. Os quatro indicadores acima são
          leituras reais do banco.
        </p>
      </Card>
    </div>
  );
}
