import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { CategoryForm } from "../category-form";
import { createCategoryAction } from "../actions";

export default async function NewPurchaseCategoryPage() {
  await requireSession();
  return (
    <div>
      <Link
        href="/categorias-compras"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Categorias de Compras
      </Link>
      <h1 className="mb-1 text-xl font-bold">Nova categoria de compras</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Defina a taxonomia de gasto, o responsável, o orçamento e a natureza (Capex/Opex/MRO).
      </p>
      <CategoryForm action={createCategoryAction} />
    </div>
  );
}
