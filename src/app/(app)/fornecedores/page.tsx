import Link from "next/link";
import { Star } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listSuppliers } from "@/lib/data/suppliers";
import { Card, Badge } from "@/components/ui";
import type { SupplierStatus, SupplierCategory } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

const statusTone: Record<SupplierStatus, Tone> = {
  em_homologacao: "warn",
  ativo: "good",
  inativo: "neutral",
  bloqueado: "danger",
};
const statusLabel: Record<SupplierStatus, string> = {
  em_homologacao: "Em homologação",
  ativo: "Ativo",
  inativo: "Inativo",
  bloqueado: "Bloqueado",
};
export const categoryLabel: Record<SupplierCategory, string> = {
  materia_prima: "Matéria-prima",
  manufatura: "Manufatura",
  embalagem: "Embalagem",
  logistica: "Logística",
  servicos: "Serviços",
  marketing: "Marketing",
  tecnologia: "Tecnologia",
};

export default async function FornecedoresPage() {
  const session = await requireSession();
  const suppliers = await listSuppliers(session.tenantId);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Fornecedores</h1>
          <p className="text-sm text-neutral-500">
            Base de fornecedores homologados — categorias, lead time e avaliação
          </p>
        </div>
        <Badge tone="info">{suppliers.length} fornecedor(es)</Badge>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-3 font-medium">Fornecedor</th>
              <th className="px-5 py-3 font-medium">Categoria</th>
              <th className="px-5 py-3 font-medium">Local</th>
              <th className="px-5 py-3 text-right font-medium">Lead time</th>
              <th className="px-5 py-3 text-right font-medium">Rating</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr
                key={s.id}
                className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
              >
                <td className="px-5 py-3">
                  <Link
                    href={`/fornecedores/${s.id}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {s.tradeName ?? s.legalName}
                  </Link>
                  <div className="text-xs text-neutral-400">{s.code}</div>
                </td>
                <td className="px-5 py-3">{categoryLabel[s.category]}</td>
                <td className="px-5 py-3">
                  {[s.city, s.countryName].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {s.leadTimeDays != null ? `${s.leadTimeDays} d` : "—"}
                </td>
                <td className="px-5 py-3 text-right">
                  {s.rating != null ? (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      {Number(s.rating).toFixed(1).replace(".", ",")}
                      <Star size={13} className="fill-amber-400 text-amber-400" />
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-3">
                  <Badge tone={statusTone[s.status]}>{statusLabel[s.status]}</Badge>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nenhum fornecedor cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
