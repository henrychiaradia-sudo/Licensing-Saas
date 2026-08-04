import Link from "next/link";
import { Plus, Search, Package, CheckCircle2, Archive, Upload } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listCatalogItems, catalogSummary, AUDIENCE_LABEL } from "@/lib/data/catalog";
import { Button, Card, Badge, Input } from "@/components/ui";
import { ExportCsvButton } from "@/components/export-csv-button";
import { fmtBRL } from "@/lib/utils";
import type { CatalogItemStatus, CatalogAudience } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";
export const itemTone: Record<CatalogItemStatus, Tone> = {
  ativo: "good",
  inativo: "neutral",
  descontinuado: "danger",
};
export const itemLabel: Record<CatalogItemStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  descontinuado: "Descontinuado",
};
const STATUS_KEYS = Object.keys(itemLabel) as CatalogItemStatus[];
const AUDIENCE_KEYS = Object.keys(AUDIENCE_LABEL) as CatalogAudience[];

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; publico?: string }>;
}) {
  const session = await requireSession();
  const { q, status, publico } = await searchParams;
  const statusFilter =
    status && (STATUS_KEYS as string[]).includes(status) ? (status as CatalogItemStatus) : undefined;
  const audienceFilter =
    publico && (AUDIENCE_KEYS as string[]).includes(publico) ? (publico as CatalogAudience) : undefined;

  const [rows, summary] = await Promise.all([
    listCatalogItems(session.tenantId, { q, status: statusFilter, publico: audienceFilter }),
    catalogSummary(session.tenantId),
  ]);

  const csvColumns = [
    { key: "sku", label: "SKU" },
    { key: "nome", label: "Nome" },
    { key: "categoria", label: "Categoria" },
    { key: "marca", label: "Marca" },
    { key: "grade", label: "Grade" },
    { key: "publico", label: "Público" },
    { key: "upc", label: "UPC" },
    { key: "ncm", label: "NCM" },
    { key: "unidade", label: "Unidade" },
    { key: "preco_tabela", label: "Preço de tabela" },
    { key: "preco_custo", label: "Preço de custo" },
    { key: "status", label: "Status" },
  ];
  const csvRows = rows.map((r) => ({
    sku: r.sku,
    nome: r.name,
    categoria: r.categoryName ?? "",
    marca: r.brandName ?? "",
    grade: r.gradeName ?? r.grade ?? "",
    publico: r.publico ? AUDIENCE_LABEL[r.publico] : "",
    upc: r.upc ?? "",
    ncm: r.ncm ?? "",
    unidade: r.unit,
    preco_tabela: r.listPrice,
    preco_custo: r.costPrice ?? "",
    status: itemLabel[r.status],
  }));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Catálogo de Itens (SKU)</h1>
          <p className="text-sm text-neutral-500">Itens licenciados com categoria, NCM e preço</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton filename="catalogo.csv" columns={csvColumns} rows={csvRows} />
          <Link href="/catalogo/importar">
            <Button variant="outline">
              <Upload size={16} /> Importar
            </Button>
          </Link>
          <Link href="/catalogo/new">
            <Button>
              <Plus size={16} /> Novo item
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Kpi label="Itens no catálogo" value={String(summary.total)} icon={<Package size={16} className="text-neutral-400" />} />
        <Kpi label="Ativos" value={String(summary.active)} icon={<CheckCircle2 size={16} className="text-emerald-500" />} />
        <Kpi label="Descontinuados" value={String(summary.discontinued)} icon={<Archive size={16} className="text-red-400" />} />
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Buscar</label>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input name="q" defaultValue={q ?? ""} placeholder="SKU ou nome" className="pl-9" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Público</label>
          <select
            name="publico"
            defaultValue={audienceFilter ?? ""}
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Todos</option>
            {AUDIENCE_KEYS.map((a) => (
              <option key={a} value={a}>
                {AUDIENCE_LABEL[a]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Todos</option>
            {STATUS_KEYS.map((s) => (
              <option key={s} value={s}>
                {itemLabel[s]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {(q || statusFilter || audienceFilter) && (
          <Link href="/catalogo" className="text-sm text-neutral-500 hover:underline">
            Limpar
          </Link>
        )}
      </form>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-3 font-medium">SKU</th>
              <th className="px-5 py-3 font-medium">Item</th>
              <th className="px-5 py-3 font-medium">Categoria</th>
              <th className="px-5 py-3 font-medium">Grade</th>
              <th className="px-5 py-3 font-medium">Público</th>
              <th className="px-5 py-3 text-right font-medium">Preço tabela</th>
              <th className="px-5 py-3 text-right font-medium">Preço custo</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50">
                <td className="px-5 py-3">
                  <Link href={`/catalogo/${r.id}`} className="font-semibold text-blue-600 hover:underline">
                    {r.sku}
                  </Link>
                </td>
                <td className="px-5 py-3">
                  {r.name}
                  {r.brandName && <div className="text-xs text-neutral-400">{r.brandName}</div>}
                </td>
                <td className="px-5 py-3 text-neutral-500">{r.categoryName ?? "—"}</td>
                <td className="px-5 py-3 text-neutral-500">{r.gradeName ?? r.grade ?? "—"}</td>
                <td className="px-5 py-3 text-neutral-500">{r.publico ? AUDIENCE_LABEL[r.publico] : "—"}</td>
                <td className="px-5 py-3 text-right tabular-nums">{fmtBRL(Number(r.listPrice))}</td>
                <td className="px-5 py-3 text-right tabular-nums text-neutral-500">
                  {r.costPrice != null ? fmtBRL(Number(r.costPrice)) : "—"}
                </td>
                <td className="px-5 py-3">
                  <Badge tone={itemTone[r.status]}>{itemLabel[r.status]}</Badge>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nenhum item no catálogo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}
