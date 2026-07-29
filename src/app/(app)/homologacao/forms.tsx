"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { Button, Input, Label, Select } from "@/components/ui";
import { createChecklistAction, addItemAction, type SubState } from "./actions";
import { SUPPLIER_TYPE_OPTIONS } from "../fornecedores/supplier-meta";

function useReset(ok: boolean | undefined) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (ok) ref.current?.reset();
  }, [ok]);
  return ref;
}

export function ChecklistForm() {
  const [state, action, pending] = useActionState<SubState, FormData>(createChecklistAction, {
    error: null,
  });
  const ref = useReset(state.ok);
  return (
    <form ref={ref} action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="lg:col-span-1">
        <Label htmlFor="name">Nome do checklist *</Label>
        <Input id="name" name="name" required placeholder="Homologação padrão" />
      </div>
      <div className="lg:col-span-1">
        <Label htmlFor="supplierType">Tipo de fornecedor (opcional)</Label>
        <Select id="supplierType" name="supplierType" defaultValue="">
          <option value="">Todos os tipos</option>
          {SUPPLIER_TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="lg:col-span-2">
        <Label htmlFor="description">Descrição</Label>
        <Input id="description" name="description" placeholder="Quando usar este checklist" />
      </div>
      {state.error && <p className="text-sm text-red-600 sm:col-span-2 lg:col-span-4">{state.error}</p>}
      <div className="sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={pending}>
          <Plus size={15} /> {pending ? "Criando…" : "Criar checklist"}
        </Button>
      </div>
    </form>
  );
}

export function ItemForm({ checklistId }: { checklistId: string }) {
  const [state, action, pending] = useActionState<SubState, FormData>(
    addItemAction.bind(null, checklistId),
    { error: null },
  );
  const ref = useReset(state.ok);
  const cls = "h-9 text-sm";
  return (
    <form ref={ref} action={action} className="grid gap-2 sm:grid-cols-12 sm:items-center">
      <Input name="label" required placeholder="Item de verificação *" className={`${cls} sm:col-span-5`} />
      <Input name="category" placeholder="Categoria (Documental, ESG…)" className={`${cls} sm:col-span-3`} />
      <Input name="weight" type="number" min="1" max="10" step="1" defaultValue="1" title="Peso" className={`${cls} sm:col-span-1`} />
      <label className="flex items-center gap-1.5 text-xs text-neutral-500 sm:col-span-2">
        <input type="checkbox" name="required" value="1" defaultChecked /> Obrigatório
      </label>
      <Button type="submit" size="sm" disabled={pending} className="sm:col-span-1">
        <Plus size={13} />
      </Button>
      {state.error && <p className="text-xs text-red-600 sm:col-span-12">{state.error}</p>}
    </form>
  );
}
