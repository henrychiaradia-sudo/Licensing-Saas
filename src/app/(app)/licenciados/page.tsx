import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listLicensees } from "@/lib/data/licensees";
import { Button, Card, Badge } from "@/components/ui";
import type { LicenseeStatus } from "@/lib/db/schema";

const statusLabels: Record<LicenseeStatus, string> = {
  em_negociacao: "Em negociação",
  ativo: "Ativo",
  inativo: "Inativo",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
};

const statusTone: Record<LicenseeStatus, "good" | "info" | "warn" | "neutral" | "danger"> = {
  ativo: "good",
  em_negociacao: "info",
  suspenso: "warn",
  inativo: "neutral",
  encerrado: "danger",
};

export default async function LicenciadosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireSession();
  const { q } = await searchParams;
  const rows = await listLicensees(session.tenantId, q);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Licenciados</h1>
          <p className="text-sm text-neutral-500">Cadastro mestre · {rows.length} registro(s)</p>
        </div>
        <Link href="/licenciados/new">
          <Button>
            <Plus size={16} /> Novo licenciado
          </Button>
        </Link>
      </div>

      <Card className="overflow-hidden">
        <form className="border-b border-neutral-200 p-3 dark:border-neutral-800">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Buscar por razão social…"
            className="w-full max-w-sm rounded-lg border border-neutral-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-neutral-700"
          />
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-neutral-400">
                <th className="px-4 py-3 font-semibold">Razão social</th>
                <th className="px-4 py-3 font-semibold">Segmento</th>
                <th className="px-4 py-3 font-semibold">País</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-neutral-400">
                    Nenhum licenciado encontrado.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-neutral-100 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40"
                >
                  <td className="px-4 py-3">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {r.legalName}
                    </span>
                    {r.tradeName && <div className="text-xs text-neutral-400">{r.tradeName}</div>}
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{r.segmentName ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-500">{r.countryName ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {r.financialScore ? Number(r.financialScore).toFixed(0) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statusTone[r.status]}>{statusLabels[r.status]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/licenciados/${r.id}`}
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
