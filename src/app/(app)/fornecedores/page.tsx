import Link from "next/link";
import { Star, Plus, Upload } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listSuppliers } from "@/lib/data/suppliers";
import { Card, Badge, Button } from "@/components/ui";
import { ExportCsvButton } from "@/components/export-csv-button";
import type { SupplierCategory } from "@/lib/db/schema";
import { STATUS_LABEL, STATUS_TONE, TYPE_LABEL } from "./supplier-meta";

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

  const csvColumns = [
    { key: "codigo", label: "Código" },
    { key: "fornecedor", label: "Fornecedor" },
    { key: "tipo", label: "Tipo" },
    { key: "categoria", label: "Categoria" },
    { key: "local", label: "Local" },
    { key: "lead_time", label: "Lead time (dias)" },
    { key: "rating", label: "Avaliação" },
    { key: "status", label: "Status" },
  ];
  const csvRows = suppliers.map((s) => ({
    codigo: s.code,
    fornecedor: s.tradeName ?? s.legalName,
    tipo: s.supplierType ? TYPE_LABEL[s.supplierType] : "",
    categoria: categoryLabel[s.category],
    local: [s.city, s.countryName].filter(Boolean).join(" · "),
    lead_time: s.leadTimeDays ?? "",
    rating: s.rating ?? "",
    status: STATUS_LABEL[s.status],
  }));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Fornecedores</h1>
          <p className="text-sm text-neutral-500">
            Base de fornecedores homologados — categorias, lead time e avaliação
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="info">{suppliers.length} fornecedor(es)</Badge>
          <ExportCsvButton filename="fornecedores.csv" columns={csvColumns} rows={csvRows} />
          <Link href="/fornecedores/importar">
            <Button variant="outline">
              <Upload size={16} /> Importar
            </Button>
          </Link>
          <Link href="/fornecedores/new">
            <Button>
              <Plus size={16} /> Novo fornecedor
            </Button>
          </Link>
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th scope="col" className="px-5 py-3 font-medium">Fornecedor</th>
              <th scope="col" className="px-5 py-3 font-medium">Tipo</th>
              <th scope="col" className="px-5 py-3 font-medium">Categoria</th>
              <th scope="col" className="px-5 py-3 font-medium">Local</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Lead time</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Rating</th>
              <th scope="col" className="px-5 py-3 font-medium">Status</th>
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
                <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">
                  {s.supplierType ? TYPE_LABEL[s.supplierType] : "—"}
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
                  <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                </td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-neutral-400">
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
