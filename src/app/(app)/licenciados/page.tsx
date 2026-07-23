import Link from "next/link";
import { Plus } from "lucide-react";
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
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-neutral-400">
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
                    <Link
                      href={`/licenciados/${r.id}`}
                      className="font-semibold text-neutral-900 hover:text-blue-600 dark:text-neutral-100"
                    >
                      {r.legalName}
                    </Link>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
