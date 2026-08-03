import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getCatalogItemDetail, listCategoryOptions } from "@/lib/data/catalog";
import { listBrandOptions } from "@/lib/data/contracts";
import { ItemForm } from "../../item-form";
import { updateItemAction } from "../../actions";

export default async function EditCatalogItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const [item, categories, brands] = await Promise.all([
    getCatalogItemDetail(session.tenantId, id),
    listCategoryOptions(session.tenantId),
    listBrandOptions(session.tenantId),
  ]);
  if (!item) notFound();

  const action = updateItemAction.bind(null, id);

  return (
    <div>
      <Link
        href={`/catalogo/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> {item.sku}
      </Link>
      <h1 className="mb-1 text-xl font-bold">Editar item</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {item.sku} — {item.name}
      </p>
      <ItemForm
        action={action}
        submitLabel="Salvar item"
        categories={categories.map((c) => ({ id: c.id, label: c.name }))}
        brands={brands.map((b) => ({ id: b.id, label: `${b.name} (${b.code})` }))}
        initial={{
          sku: item.sku,
          name: item.name,
          description: item.description,
          categoryId: item.categoryId,
          brandId: item.brandId,
          ncm: item.ncm,
          cest: item.cest,
          unit: item.unit,
          listPrice: item.listPrice,
          costPrice: item.costPrice,
          publico: item.publico,
          grade: item.grade,
          pantone: item.pantone,
          upi: item.upi,
          upc: item.upc,
          discontinuationReason: item.discontinuationReason,
          status: item.status,
        }}
      />
    </div>
  );
}
