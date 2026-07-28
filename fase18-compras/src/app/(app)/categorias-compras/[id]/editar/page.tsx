import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getPurchaseCategoryDetail } from "@/lib/data/purchase-categories";
import { CategoryForm } from "../../category-form";
import { updateCategoryAction } from "../../actions";

export default async function EditPurchaseCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getPurchaseCategoryDetail(session.tenantId, id);
  if (!data) notFound();
  const c = data.category;

  return (
    <div>
      <Link
        href={`/categorias-compras/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> {c.name}
      </Link>
      <h1 className="mb-6 text-xl font-bold">Editar categoria</h1>
      <CategoryForm
        action={updateCategoryAction.bind(null, id)}
        submitLabel="Salvar alterações"
        defaults={{
          code: c.code,
          name: c.name,
          nature: c.nature,
          ownerName: c.ownerName,
          annualBudget: c.annualBudget,
          strategy: c.strategy,
          status: c.status,
          notes: c.notes,
        }}
      />
    </div>
  );
}
