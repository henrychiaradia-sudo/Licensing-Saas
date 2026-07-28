import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getCatalogItemDetail } from "@/lib/data/catalog";
import { itemTone, itemLabel } from "../page";
import { Card, Badge } from "@/components/ui";
import { fmtBRL } from "@/lib/utils";
import type { CatalogItemStatus } from "@/lib/db/schema";

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
        <Badge tone={itemTone[status]}>{itemLabel[status]}</Badge>
      </div>

      <Card className="p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Field label="Categoria" value={item.categoryName} />
          <Field label="Marca" value={item.brandName} />
          <Field label="Unidade" value={item.unit} />
          <Field label="Preço de tabela" value={fmtBRL(Number(item.listPrice))} />
          <Field label="NCM" value={item.ncm} />
          <Field label="CEST" value={item.cest} />
        </dl>
        {item.description && (
          <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-500 dark:border-neutral-800">
            {item.description}
          </p>
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
