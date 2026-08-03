import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listBrands } from "@/lib/data/brands";
import { Button, Card, Badge } from "@/components/ui";
import type { BrandStatus } from "@/lib/db/schema";

const labels: Record<BrandStatus, string> = {
  ativo: "Ativo",
  inativo: "Inativo",
  descontinuado: "Descontinuado",
};
const tones: Record<BrandStatus, "good" | "neutral" | "danger"> = {
  ativo: "good",
  inativo: "neutral",
  descontinuado: "danger",
};

export default async function MarcasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const { q } = await searchParams;
  const rows = await listBrands(session.tenantId, q);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Marcas &amp; IP</h1>
          <p className="text-sm text-neutral-500">Propriedades intelectuais · {rows.length} registro(s)</p>
        </div>
        <Link href="/marcas/new">
          <Button>
            <Plus size={16} /> Nova marca
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">Nome</th>
                <th className="px-4 py-3 font-semibold">Área responsável</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-neutral-400">
                    Nenhuma marca cadastrada.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40"
                >
                  <td className="px-4 py-3 font-mono text-xs text-neutral-500">{r.code}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {r.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{r.ownerArea ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge tone={tones[r.status]}>{labels[r.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/marcas/${r.id}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:border-blue-400 hover:text-blue-600 dark:border-neutral-700 dark:text-neutral-300"
                    >
                      <Pencil size={13} /> Editar
                    </Link>
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
