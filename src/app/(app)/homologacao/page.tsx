import Link from "next/link";
import { ListChecks } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listChecklists } from "@/lib/data/homologation";
import { Card, Badge, Button } from "@/components/ui";
import { ChecklistForm } from "./forms";
import { toggleActiveAction } from "./actions";
import { TYPE_LABEL } from "../fornecedores/supplier-meta";

export default async function HomologacaoPage() {
  const session = await requireSession();
  const checklists = await listChecklists(session.tenantId);
  const activeCount = checklists.filter((c) => c.isActive).length;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <ListChecks size={20} className="text-blue-500" /> Homologação de fornecedores
          </h1>
          <p className="text-sm text-neutral-500">
            Checklists e questionários configuráveis usados no processo de homologação
          </p>
        </div>
        <Badge tone="info">{activeCount} ativo(s)</Badge>
      </div>

      <Card className="mb-5 p-5">
        <h2 className="mb-3 text-sm font-semibold">Novo checklist</h2>
        <ChecklistForm />
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th scope="col" className="px-5 py-3 font-medium">Checklist</th>
              <th scope="col" className="px-5 py-3 font-medium">Tipo de fornecedor</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">Itens</th>
              <th scope="col" className="px-5 py-3 font-medium">Status</th>
              <th scope="col" className="px-5 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {checklists.map((c) => (
              <tr
                key={c.id}
                className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
              >
                <td className="px-5 py-3">
                  <Link href={`/homologacao/${c.id}`} className="font-semibold text-blue-600 hover:underline">
                    {c.name}
                  </Link>
                  {c.description && <div className="text-xs text-neutral-400">{c.description}</div>}
                </td>
                <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">
                  {c.supplierType ? TYPE_LABEL[c.supplierType] : "Todos"}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">{c.itemCount}</td>
                <td className="px-5 py-3">
                  <Badge tone={c.isActive ? "good" : "neutral"}>{c.isActive ? "Ativo" : "Inativo"}</Badge>
                </td>
                <td className="px-5 py-3 text-right">
                  <form action={toggleActiveAction.bind(null, c.id, !c.isActive)}>
                    <Button type="submit" size="sm" variant="outline">
                      {c.isActive ? "Desativar" : "Ativar"}
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
            {checklists.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nenhum checklist criado ainda. Crie o primeiro acima.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
