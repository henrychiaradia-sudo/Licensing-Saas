import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listProducts } from "@/lib/data/products";
import { Card, Badge } from "@/components/ui";
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

export default async function ProdutosPage() {
  const session = await requireSession();
  const rows = await listProducts(session.tenantId);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Aprovação de Produtos</h1>
        <p className="text-sm text-neutral-500">Workflow multi-alçada · {rows.length} produto(s)</p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3 font-semibold">SKU / Produto</th>
                <th className="px-4 py-3 font-semibold">Marca</th>
                <th className="px-4 py-3 font-semibold">Licenciado</th>
                <th className="px-4 py-3 font-semibold">Progresso</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-neutral-400">
                    Nenhum produto em aprovação.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/produtos/${r.id}`}
                      className="font-semibold text-neutral-900 hover:text-blue-600 dark:text-neutral-100"
                    >
                      {r.name}
                    </Link>
                    <div className="font-mono text-xs text-neutral-400">{r.sku}</div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{r.brandName ?? "—"}</td>
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
