import Link from "next/link";
import { Sparkles, AlertTriangle, Info, CheckCircle2, Lightbulb, ArrowRight } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { portalInsights } from "@/lib/data/portal-insights";
import { Card } from "@/components/ui";

type Sev = "info" | "warn" | "danger" | "success";

const SEV: Record<Sev, { border: string; icon: React.ReactNode }> = {
  danger: { border: "border-l-red-500", icon: <AlertTriangle size={16} className="text-red-500" /> },
  warn: { border: "border-l-amber-500", icon: <AlertTriangle size={16} className="text-amber-500" /> },
  info: { border: "border-l-blue-500", icon: <Info size={16} className="text-blue-500" /> },
  success: { border: "border-l-emerald-500", icon: <CheckCircle2 size={16} className="text-emerald-500" /> },
};

export default async function PortalIaPage() {
  const session = await requireLicenseeSession();
  const { summary, insights, recommendations } = await portalInsights(
    session.tenantId,
    session.licenseeId,
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Sparkles size={20} className="text-emerald-600" /> Assistente IA
        </h1>
        <p className="text-sm text-neutral-500">
          Análise inteligente da sua operação de licenciamento — o que merece sua atenção agora.
        </p>
      </div>

      {/* Resumo */}
      <Card className="mb-5 flex items-start gap-3 border-emerald-200 bg-emerald-50/50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/10">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
          <Sparkles size={18} />
        </span>
        <div>
          <div className="text-sm font-semibold">Resumo do assistente</div>
          <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-300">{summary}</p>
        </div>
      </Card>

      {/* Insights */}
      <div className="grid gap-4 md:grid-cols-2">
        {insights.map((it, i) => (
          <Card key={i} className={`border-l-4 p-5 ${SEV[it.severity].border}`}>
            <div className="flex items-center gap-2">
              {SEV[it.severity].icon}
              <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                {it.category}
              </span>
            </div>
            <h3 className="mt-1.5 text-sm font-semibold">{it.title}</h3>
            <p className="mt-1 text-[13px] text-neutral-500">{it.body}</p>
            {it.link && (
              <Link
                href={it.link}
                className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-emerald-700 hover:underline dark:text-emerald-400"
              >
                Ir para a tela <ArrowRight size={13} />
              </Link>
            )}
          </Card>
        ))}
      </div>

      {/* Recomendações */}
      <Card className="mt-5 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Lightbulb size={16} className="text-amber-500" /> Recomendações
        </h2>
        <ul className="space-y-2">
          {recommendations.map((r, i) => (
            <li key={i} className="flex items-start gap-2 text-[13.5px] text-neutral-600 dark:text-neutral-300">
              <ArrowRight size={15} className="mt-0.5 shrink-0 text-emerald-500" />
              {r}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
