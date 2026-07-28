import Link from "next/link";
import { Plus } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listPlans, plansSummary } from "@/lib/data/marketing-plans";
import { Button, Card, Badge } from "@/components/ui";
import { ProgressBar } from "@/components/charts";
import { fmtBRL, fmtCompactBRL, fmtDate } from "@/lib/utils";
import { MarketingNav } from "../nav";
import { planStatusTone, planStatusLabel } from "../labels";

export default async function PlansPage() {
  const session = await requireSession();
  const [rows, summary] = await Promise.all([
    listPlans(session.tenantId),
    plansSummary(session.tenantId),
  ]);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Planos de marketing</h1>
          <p className="text-sm text-neutral-500">
            Planejamento anual por marca/licenciado, com verba e campanhas vinculadas.
          </p>
        </div>
        <Link href="/marketing/planos/novo">
          <Button>
            <Plus size={16} /> Novo plano
          </Button>
        </Link>
      </div>

      <MarketingNav />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Mini label="Planos" value={String(summary.total)} />
        <Mini label="Aprovados/execução" value={String(summary.approved)} />
        <Mini label="Verba planejada" value={fmtCompactBRL(summary.budget)} />
      </div>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-sm text-neutral-400">Nenhum plano cadastrado.</Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {rows.map((p) => {
            const budget = Number(p.budget);
            const realized = Number(p.realized);
            const usage = budget > 0 ? Math.round((realized / budget) * 100) : 0;
            return (
              <Link key={p.id} href={`/marketing/planos/${p.id}`}>
                <Card className="p-5 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-400">
                        {p.planNumber}
                        {p.year ? ` · ${p.year}` : ""}
                      </div>
                      <div className="mt-0.5 truncate text-sm font-semibold">{p.name}</div>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        {p.brandName ?? "Todas as marcas"}
                        {p.licenseeName ? ` · ${p.licenseeName}` : ""}
                      </div>
                    </div>
                    <Badge tone={planStatusTone[p.status]}>{planStatusLabel[p.status]}</Badge>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
                      <span>
                        Realizado <strong className="tabular-nums">{fmtBRL(realized)}</strong>
                      </span>
                      <span className="tabular-nums">{fmtBRL(budget)}</span>
                    </div>
                    <ProgressBar pct={usage} />
                    <div className="mt-1 flex items-center justify-between text-[11px] text-neutral-400">
                      <span>{usage}% da verba</span>
                      {p.startDate && (
                        <span>
                          {fmtDate(p.startDate)}
                          {p.endDate ? ` → ${fmtDate(p.endDate)}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div className="mt-1.5 text-xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}
