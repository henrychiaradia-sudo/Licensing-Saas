import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getChecklist } from "@/lib/data/homologation";
import { Card, Badge, Button } from "@/components/ui";
import { ItemForm } from "../forms";
import { deleteItemAction, toggleActiveAction, deleteChecklistAction } from "../actions";
import { TYPE_LABEL } from "../../fornecedores/supplier-meta";

export default async function ChecklistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getChecklist(session.tenantId, id);
  if (!data) notFound();
  const { checklist: c, items } = data;
  const totalWeight = items.reduce((sum, it) => sum + (it.weight ?? 0), 0);

  return (
    <div>
      <Link
        href="/homologacao"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Homologação
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{c.name}</h1>
            <Badge tone={c.isActive ? "good" : "neutral"}>{c.isActive ? "Ativo" : "Inativo"}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-neutral-500">
            {c.supplierType ? TYPE_LABEL[c.supplierType] : "Todos os tipos"}
            {c.description ? ` · ${c.description}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form action={toggleActiveAction.bind(null, c.id, !c.isActive)}>
            <Button type="submit" size="sm" variant="outline">
              {c.isActive ? "Desativar" : "Ativar"}
            </Button>
          </form>
          <form action={deleteChecklistAction.bind(null, c.id)}>
            <Button type="submit" size="sm" variant="outline">
              <Trash2 size={14} /> Excluir
            </Button>
          </form>
        </div>
      </div>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Itens de verificação</h2>
          <span className="text-xs text-neutral-500">
            {items.length} itens · peso total {totalWeight}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Categoria</th>
                <th className="px-3 py-2 text-right font-medium">Peso</th>
                <th className="px-3 py-2 font-medium">Obrigatório</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-3 py-2 font-medium">{it.label}</td>
                  <td className="px-3 py-2 text-neutral-500">{it.category ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{it.weight}</td>
                  <td className="px-3 py-2">
                    <Badge tone={it.required ? "info" : "neutral"}>{it.required ? "Sim" : "Não"}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <form action={deleteItemAction.bind(null, c.id, it.id)}>
                      <button type="submit" aria-label="Remover" className="text-neutral-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-sm text-neutral-400">
                    Nenhum item ainda. Adicione abaixo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <ItemForm checklistId={c.id} />
        </div>
      </Card>
    </div>
  );
}
