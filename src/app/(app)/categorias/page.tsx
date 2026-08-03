import { FolderTree, Tags } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listCategoryTree, listCategoryOptions } from "@/lib/data/catalog";
import { CategoryForm } from "./category-form";
import { GradeForm } from "./grade-form";
import { CategoryTree } from "./category-tree";
import { Card } from "@/components/ui";

export default async function CategoriasPage() {
  const session = await requireSession();
  const [tree, options] = await Promise.all([
    listCategoryTree(session.tenantId),
    listCategoryOptions(session.tenantId),
  ]);

  // Rótulos hierárquicos (Categoria-mãe › Subcategoria) para deixar claro onde a grade se encaixa.
  const nameById = new Map(options.map((o) => [o.id, o.name]));
  const catLabels = options.map((o) => ({
    id: o.id,
    label: o.parentId && nameById.has(o.parentId) ? `${nameById.get(o.parentId)} › ${o.name}` : o.name,
  }));

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Gestão de Categorias</h1>
        <p className="text-sm text-neutral-500">
          Árvore navegável (categoria → subcategoria → grade → itens). Clique para expandir e ver os SKUs.
        </p>
      </div>

      <Card className="mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold">Nova categoria</h2>
        <CategoryForm parents={options.map((o) => ({ id: o.id, label: o.name }))} />
      </Card>

      <Card className="mb-4 p-5">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Tags size={15} className="text-blue-500" /> Nova grade / subtipo
        </h2>
        <p className="mb-3 text-xs text-neutral-500">
          Detalhe subtipos estruturados por categoria (ex.: Bonés → Aba Reta, Baseball, Trucker). A grade fica
          disponível como opção no cadastro do SKU.
        </p>
        <GradeForm categories={catLabels} />
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
