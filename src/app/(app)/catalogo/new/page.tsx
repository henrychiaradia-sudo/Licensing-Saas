import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listCategoryOptions } from "@/lib/data/catalog";
import { listBrandOptions } from "@/lib/data/contracts";
import { ItemForm } from "../item-form";
import { createItemAction } from "../actions";

export default async function NewItemPage() {
  const session = await requireSession();
  const [categories, brands] = await Promise.all([
    listCategoryOptions(session.tenantId),
    listBrandOptions(session.tenantId),
  ]);

  return (
    <div>
      <Link
        href="/catalogo"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Catálogo de Itens
      </Link>
      <h1 className="mb-1 text-xl font-bold">Novo item</h1>
      <p className="mb-6 text-sm text-neutral-500">Cadastre um SKU no catálogo licenciado.</p>
      <ItemForm
        action={createItemAction}
        categories={categories.map((c) => ({ id: c.id, label: c.name }))}
        brands={brands.map((b) => ({ id: b.id, label: `${b.name} (${b.code})` }))}
      />
    </div>
  );
}
