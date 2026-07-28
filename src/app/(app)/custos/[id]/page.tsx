import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, ArrowDown } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getCostSheetDetail } from "@/lib/data/cost-sheets";
import { COST_GROUPS } from "@/lib/costing";
import { Card, Badge, Button } from "@/components/ui";
import { fmtBRL, fmtPct } from "@/lib/utils";

export default async function CostSheetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getCostSheetDetail(session.tenantId, id);
  if (!data) notFound();
  const { sheet, productName, supplierName, result } = data;
  const s = sheet as unknown as Record<string, string | null>;
  const val = (k: string) => Number(s[k] ?? 0);
  const groupSubtotal = (keys: string[]) => keys.reduce((sum, k) => sum + val(k), 0);

  return (
    <div>
      <Link
        href="/custos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Gestão de Custos
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{sheet.name}</h1>
          <p className="text-sm text-neutral-500">
            {sheet.code}
            {sheet.sku ? ` · ${sheet.sku}` : ""}
            {productName ? ` · ${productName}` : ""}
            {supplierName ? ` · ${supplierName}` : ""} · moeda {sheet.currency}
          </p>
        </div>
        <Link href={`/custos/${sheet.id}/editar`}>
          <Button size="sm" variant="outline">
            <Pencil size={14} /> Editar
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Custo total" value={fmtBRL(result.custoTotal)} />
        <Metric label="Markup" value={fmtPct(result.markupPct, 1)} />
        <Metric label="Preço sugerido" value={fmtBRL(result.precoSugerido)} highlight />
        <Metric label="Margem" value={fmtPct(result.margemPct, 1)} tone="good" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Breakdown detalhado */}
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Composição do custo</h2>
          <div className="space-y-4">
            {COST_GROUPS.map((g) => {
              const keys = g.fields.map((f) => f.key as string);
              const subtotal = groupSubtotal(keys);
              return (
                <div key={g.group}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                      {g.group}
                    </h3>
                    <span className="text-sm font-semibold tabular-nums">{fmtBRL(subtotal)}</span>
                  </div>
                  <dl className="divide-y divide-neutral-100 rounded-xl border border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
                    {g.fields.map((f) => (
                      <div key={f.key} className="flex items-center justify-between px-3 py-1.5 text-sm">
                        <dt className="text-neutral-500">{f.label}</dt>
                        <dd className="tabular-nums">{fmtBRL(val(f.key as string))}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Waterfall resumido */}
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-semibold">Do custo ao preço</h2>
          <div className="space-y-2 text-sm">
            <WRow label="CIF" value={fmtBRL(result.cif)} />
            <WRow label="+ Impostos" value={fmtBRL(result.impostos)} />
            <WRow label="+ Custos de importação" value={fmtBRL(result.custosImportacao)} />
            <WRow label="+ Outros custos" value={fmtBRL(result.outrosCustos)} />
            <WRow label="+ Custo industrial" value={fmtBRL(val("custoIndustrial"))} />
          </div>
          <div className="my-3 flex items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
            <span className="text-sm font-semibold">Custo total</span>
            <span className="ml-auto text-base font-bold tabular-nums">{fmtBRL(result.custoTotal)}</span>
          </div>
          <div className="flex items-center justify-center py-1 text-neutral-300">
            <ArrowDown size={16} />
          </div>
          <div className="rounded-xl alz-gradient p-4 text-white">
            <div className="text-xs text-white/80">Preço sugerido (markup {fmtPct(result.markupPct, 1)})</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">{fmtBRL(result.precoSugerido)}</div>
            <div className="mt-1 text-xs text-white/80">Margem {fmtPct(result.margemPct, 1)}</div>
          </div>
        </Card>
      </div>

      {sheet.notes && (
        <Card className="mt-4 p-5">
          <h2 className="mb-1 text-sm font-semibold">Observações</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">{sheet.notes}</p>
        </Card>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "good";
}) {
  return (
    <Card className={`p-4 ${highlight ? "border-blue-200 dark:border-blue-900" : ""}`}>
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div
        className={`mt-1.5 text-xl font-bold tabular-nums ${
          highlight ? "text-blue-600 dark:text-blue-400" : tone === "good" ? "text-emerald-600" : ""
        }`}
      >
        {value}
      </div>
    </Card>
  );
}

function WRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
