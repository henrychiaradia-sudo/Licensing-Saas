import Link from "next/link";
import {
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Info,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Search as SearchIcon,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import {
  generateInsights,
  generateRecommendations,
  executiveSummary,
  smartSearch,
  SEARCH_EXAMPLES,
  type Severity,
} from "@/lib/data/ai-insights";
import { Card, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SearchBox } from "./search-box";

const SEV: Record<
  Severity,
  { label: string; icon: typeof AlertTriangle; box: string; chip: "danger" | "warn" | "info" | "good" }
> = {
  critica: {
    label: "Crítico",
    icon: AlertTriangle,
    box: "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20",
    chip: "danger",
  },
  atencao: {
    label: "Atenção",
    icon: AlertCircle,
    box: "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20",
    chip: "warn",
  },
  info: {
    label: "Info",
    icon: Info,
    box: "border-blue-200 bg-blue-50/40 dark:border-blue-900 dark:bg-blue-950/20",
    chip: "info",
  },
  positivo: {
    label: "Positivo",
    icon: TrendingUp,
    box: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20",
    chip: "good",
  },
};

export default async function IaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const { q } = await searchParams;

  const [insights, recs, summary, search] = await Promise.all([
    generateInsights(session.tenantId),
    generateRecommendations(session.tenantId),
    executiveSummary(session.tenantId),
    q && q.trim() ? smartSearch(session.tenantId, q) : Promise.resolve(null),
  ]);

  const counts = insights.reduce<Record<string, number>>(
    (a, i) => ({ ...a, [i.severity]: (a[i.severity] ?? 0) + 1 }),
    {},
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg alz-gradient text-white">
            <Sparkles size={18} />
          </span>
          Assistente IA
        </h1>
        <p className="text-sm text-neutral-500">
          Insights, recomendações e busca inteligente sobre todos os dados da plataforma
        </p>
      </div>

      {/* Busca */}
      <Card className="mb-5 p-5">
        <SearchBox initial={q ?? ""} examples={SEARCH_EXAMPLES} />

        {search && (
          <div className="mt-4 rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
              <SearchIcon size={15} className="text-blue-500" /> {search.title}
            </h2>
            {search.note && <p className="mb-3 text-xs text-neutral-500">{search.note}</p>}
            <div className="grid gap-1.5">
              {search.rows.map((r, i) => {
                const inner = (
                  <div className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <span className={cn(search.matched ? "font-medium" : "text-neutral-600 dark:text-neutral-300")}>
                      {r.label}
                    </span>
                    <span className="shrink-0 tabular-nums text-neutral-500">{r.value}</span>
                  </div>
                );
                return r.href ? (
                  <Link key={i} href={r.href}>
                    {inner}
                  </Link>
                ) : (
                  <div key={i}>{inner}</div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Resumo executivo */}
      <Card className="mb-5 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Sparkles size={16} className="text-blue-500" /> Resumo executivo
        </h2>
        <div className="space-y-2">
          {summary.text.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              {p}
            </p>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {summary.metrics.map((m) => (
            <Link
              key={m.label}
              href={m.href}
              className="rounded-xl border border-neutral-200 p-3 hover:border-blue-400 dark:border-neutral-800"
            >
              <div className="text-sm font-bold tabular-nums">{m.value}</div>
              <div className="mt-0.5 text-[11px] text-neutral-400">{m.label}</div>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        {/* Insights */}
        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <AlertCircle size={16} className="text-blue-500" /> Insights automáticos
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {counts.critica ? <Badge tone="danger">{counts.critica} crítico(s)</Badge> : null}
              {counts.atencao ? <Badge tone="warn">{counts.atencao} atenção</Badge> : null}
              {counts.positivo ? <Badge tone="good">{counts.positivo} positivo(s)</Badge> : null}
            </div>
          </div>
          <div className="space-y-2.5">
            {insights.map((it) => {
              const s = SEV[it.severity];
              const Icon = s.icon;
              const body = (
                <div className={cn("rounded-xl border p-3.5", s.box)}>
                  <div className="flex items-start gap-3">
                    <Icon
                      size={17}
                      className={cn(
                        "mt-0.5 shrink-0",
                        it.severity === "critica" && "text-red-600",
                        it.severity === "atencao" && "text-amber-600",
                        it.severity === "info" && "text-blue-600",
                        it.severity === "positivo" && "text-emerald-600",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{it.title}</span>
                        <span className="text-[10px] uppercase tracking-wide text-neutral-400">
                          {it.category}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        {it.description}
                      </p>
                      {it.action && it.href && (
                        <span className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600">
                          {it.action} <ArrowRight size={11} />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
              return it.href ? (
                <Link key={it.id} href={it.href} className="block">
                  {body}
                </Link>
              ) : (
                <div key={it.id}>{body}</div>
              );
            })}
            {insights.length === 0 && (
              <p className="py-6 text-center text-sm text-neutral-400">
                Nenhum alerta no momento. Tudo sob controle. 🎉
              </p>
            )}
          </div>
        </Card>

        {/* Recomendações */}
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Lightbulb size={16} className="text-amber-500" /> Recomendações
          </h2>
          <div className="space-y-2.5">
            {recs.map((r) => {
              const body = (
                <div className="rounded-xl border border-neutral-200 p-3.5 hover:border-blue-300 dark:border-neutral-800">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/60">
                      <Lightbulb size={12} />
                    </span>
                    {r.title}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{r.detail}</p>
                </div>
              );
              return r.href ? (
                <Link key={r.id} href={r.href} className="block">
                  {body}
                </Link>
              ) : (
                <div key={r.id}>{body}</div>
              );
            })}
            {recs.length === 0 && (
              <p className="py-6 text-center text-sm text-neutral-400">
                Sem recomendações no momento.
              </p>
            )}
          </div>
        </Card>
      </div>

      <p className="mt-4 text-center text-[11px] text-neutral-400">
        As análises são geradas automaticamente a partir dos seus dados em tempo real.
      </p>
    </div>
  );
}
