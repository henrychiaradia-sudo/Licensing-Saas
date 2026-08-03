import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getCatalogItemDetail, AUDIENCE_LABEL } from "@/lib/data/catalog";
import { itemTone, itemLabel } from "../page";
import { Card, Badge, Button } from "@/components/ui";
import { fmtBRL } from "@/lib/utils";
import type { CatalogItemStatus, CatalogAudience } from "@/lib/db/schema";

export default async function CatalogItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const item = await getCatalogItemDetail(session.tenantId, id);
  if (!item) notFound();
  const status = item.status as CatalogItemStatus;

  return (
    <div>
      <Link
        href="/catalogo"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Catálogo de Itens
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{item.name}</h1>
          <p className="text-sm text-neutral-500">
            SKU {item.sku}
            {item.brandName ? ` · ${item.brandName}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={itemTone[status]}>{itemLabel[status]}</Badge>
          <Link href={`/catalogo/${item.id}/editar`}>
            <Button variant="outline" size="sm">
              <Pencil size={14} /> Editar
            </Button>
          </Link>
        </div>
      </div>

      <Card className="p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Field label="Categoria / Subcategoria" value={item.categoryName} />
          <Field label="Marca" value={item.brandName} />
          <Field label="Grade / Subtipo" value={item.gradeName ?? item.grade} />
          <Field label="Público" value={item.publico ? AUDIENCE_LABEL[item.publico as CatalogAudience] : null} />
          <Field label="Unidade" value={item.unit} />
          <Field label="Preço de tabela" value={fmtBRL(Number(item.listPrice))} />
          <Field label="Preço de custo" value={item.costPrice != null ? fmtBRL(Number(item.costPrice)) : null} />
          <Field label="Cor Pantone" value={item.pantone} />
          <Field label="UPI" value={item.upi} />
          <Field label="UPC" value={item.upc} />
          <Field label="NCM" value={item.ncm} />
          <Field label="CEST" value={item.cest} />
        </dl>
        {item.description && (
          <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-500 dark:border-neutral-800">
            {item.description}
          </p>
        )}
        {status === "descontinuado" && item.discontinuationReason && (
          <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            <span className="font-semibold">Motivo de descontinuação: </span>
            {item.discontinuationReason}
          </div>
        )}
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="font-medium">{value ?? "—"}</dd>
    </div>
  );
}
