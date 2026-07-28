import { FolderTree, Folder, Tag } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listCategoryTree, listCategoryOptions, type CategoryNode } from "@/lib/data/catalog";
import { CategoryForm } from "./category-form";
import { Card, Badge } from "@/components/ui";

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
        <p className="text-sm text-neutral-500">Árvore de categorias do catálogo (categoria → subcategoria)</p>
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
          <ul className="space-y-1">
            {tree.map((node) => (
              <CategoryRow key={node.id} node={node} depth={0} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function CategoryRow({ node, depth }: { node: CategoryNode; depth: number }) {
  return (
    <li>
      <div
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {node.children.length > 0 ? (
          <Folder size={15} className="text-amber-500" />
        ) : (
          <Tag size={14} className="text-neutral-400" />
        )}
        <span className="font-medium">{node.name}</span>
        {node.code && <span className="text-xs text-neutral-400">({node.code})</span>}
        {node.itemCount > 0 && (
          <Badge tone="neutral" className="ml-1">
            {node.itemCount} {node.itemCount === 1 ? "item" : "itens"}
          </Badge>
        )}
      </div>
      {node.children.length > 0 && (
        <ul className="space-y-1">
          {node.children.map((child) => (
            <CategoryRow key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}
