import Link from "next/link";
import { Plus } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { listPortalProducts } from "@/lib/data/portal";
import { Card, Badge, Button } from "@/components/ui";
import type { ProductStatus } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";
const statusMeta: Record<ProductStatus, { label: string; tone: Tone }> = {
  rascunho: { label: "Rascunho", tone: "neutral" },
  submetido: { label: "Submetido", tone: "info" },
  em_aprovacao: { label: "Em aprovação", tone: "info" },
  aprovado: { label: "Aprovado", tone: "good" },
  aprovado_com_ressalvas: { label: "Aprovado c/ ressalvas", tone: "warn" },
  reprovado: { label: "Reprovado", tone: "danger" },
  descontinuado: { label: "Descontinuado", tone: "neutral" },
};

export default async function PortalProdutos() {
  const session = await requireLicenseeSession();
  const products = await listPortalProducts(session.tenantId, session.licenseeId);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Produtos & Aprovações</h1>
          <p className="text-sm text-neutral-500">
            Submeta produtos para aprovação e acompanhe o parecer de cada alçada
          </p>
        </div>
        <Link href="/portal/produtos/novo">
          <Button>
            <Plus size={15} /> Submeter produto
          </Button>
        </Link>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-3 font-medium">Produto</th>
              <th className="px-5 py-3 font-medium">Marca</th>
              <th className="px-5 py-3 font-medium">Aprovação</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
              return (
                <tr
                  key={p.id}
                  className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/portal/produtos/${p.id}`}
                      className="font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                    >
                      {p.name}
                    </Link>
                    <div className="text-xs text-neutral-400">{p.sku}</div>
                  </td>
                  <td className="px-5 py-3 text-neutral-500">{p.brandName ?? "—"}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-28 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-xs text-neutral-500">
                        {p.done}/{p.total || 8}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={statusMeta[p.status].tone}>{statusMeta[p.status].label}</Badge>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Você ainda não submeteu produtos. Clique em “Submeter produto”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
