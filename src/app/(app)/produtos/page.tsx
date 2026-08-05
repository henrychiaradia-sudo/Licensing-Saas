import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listProducts } from "@/lib/data/products";
import { listBrands } from "@/lib/data/brands";
import { listLicensees } from "@/lib/data/licensees";
import { parseView } from "@/lib/view";
import { Card, Badge, Button } from "@/components/ui";
import type { ProductStatus } from "@/lib/db/schema";

const pLabels: Record<ProductStatus, string> = {
  rascunho: "Rascunho",
  submetido: "Submetido",
  em_aprovacao: "Em aprovação",
  aprovado: "Aprovado",
  aprovado_com_ressalvas: "Aprovado c/ ressalvas",
  reprovado: "Reprovado",
  descontinuado: "Descontinuado",
};
const pTones: Record<ProductStatus, "neutral" | "info" | "warn" | "good" | "danger"> = {
  rascunho: "neutral",
  submetido: "info",
  em_aprovacao: "warn",
  aprovado: "good",
  aprovado_com_ressalvas: "good",
  reprovado: "danger",
  descontinuado: "neutral",
};

const STATUS_KEYS = Object.keys(pLabels) as ProductStatus[];

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string; licensee?: string; status?: string; view?: string }>;
}) {
  const session = await requireSession();
  const { brand: brandParam, licensee: licenseeParam, status: statusParam, view: viewParam } =
    await searchParams;
  const view = parseView(viewParam);

  const [brands, licensees] = await Promise.all([
    listBrands(session.tenantId),
    listLicensees(session.tenantId),
  ]);

  const brandId =
    (brandParam && brands.some((b) => b.id === brandParam) ? brandParam : undefined) ??
    (view?.dim === "marca" ? view.id : undefined);
  const licenseeId =
    (licenseeParam && licensees.some((l) => l.id === licenseeParam) ? licenseeParam : undefined) ??
    (view?.dim === "licenciado" ? view.id : undefined);
  const status =
    statusParam && (STATUS_KEYS as string[]).includes(statusParam)
      ? (statusParam as ProductStatus)
      : undefined;

  const rows = await listProducts(session.tenantId, { brandId, licenseeId, status });
  const hasFilter = !!(brandId || licenseeId || status);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Aprovação de Produtos</h1>
        <p className="text-sm text-neutral-500">Workflow multi-alçada · {rows.length} produto(s)</p>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[190px]">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Marca</label>
          <select
            name="brand"
            defaultValue={brandId ?? ""}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Todas as marcas</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[190px]">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Licenciado</label>
          <select
            name="licensee"
            defaultValue={licenseeId ?? ""}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Todos os licenciados</option>
            {licensees.map((l) => (
              <option key={l.id} value={l.id}>
                {l.legalName}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[170px]">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Todos</option>
            {STATUS_KEYS.map((s) => (
              <option key={s} value={s}>
                {pLabels[s]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {hasFilter && (
          <Link href="/produtos" className="text-sm text-neutral-500 hover:underline">
            Limpar
          </Link>
        )}
      </form>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-400">
                <th scope="col" className="px-4 py-3 font-semibold">Marca</th>
                <th scope="col" className="px-4 py-3 font-semibold">Foto</th>
                <th scope="col" className="px-4 py-3 font-semibold">SKU / Produto</th>
                <th scope="col" className="px-4 py-3 font-semibold">Licenciado</th>
                <th scope="col" className="px-4 py-3 font-semibold">Progresso</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-neutral-400">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40"
                >
                  <td className="px-4 py-3 text-neutral-500">{r.brandName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
                      {r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.imageUrl}
                          alt={r.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon size={16} className="text-neutral-300 dark:text-neutral-600" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/produtos/${r.id}`}
                      className="font-semibold text-neutral-900 hover:text-blue-600 dark:text-neutral-100"
                    >
                      {r.name}
                    </Link>
                    <div className="font-mono text-xs text-neutral-400">{r.sku}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{r.licenseeName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div
                          className="h-full rounded-full bg-blue-600"
                          style={{ width: `${r.total ? (r.done / r.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-xs text-neutral-500">
                        {r.done}/{r.total || 8}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={pTones[r.status]}>{pLabels[r.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
