import { FolderTree } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listCategoryTree, listCategoryOptions } from "@/lib/data/catalog";
import { CategoryForm } from "./category-form";
import { CategoryTree } from "./category-tree";
import { Card } from "@/components/ui";

export default async function CategoriasPage() {
  const session = await requireSession();
  const [tree, options] = await Promise.all([
    listCategoryTree(session.tenantId),
    listCategoryOptions(session.tenantId),
  ]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Gestão de Categorias</h1>
        <p className="text-sm text-neutral-500">
          Árvore navegável (categoria → subcategoria → itens). Clique para expandir e ver os SKUs.
        </p>
      </div>

      <Card className="mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold">Nova categoria</h2>
        <CategoryForm parents={options.map((o) => ({ id: o.id, label: o.name }))} />
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <FolderTree size={16} className="text-blue-500" /> Árvore de categorias
        </h2>
        {tree.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma categoria cadastrada.</p>
        ) : (
          <CategoryTree nodes={tree} />
        )}
      </Card>
    </div>
  );
}
