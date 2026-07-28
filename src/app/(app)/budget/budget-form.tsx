"use client";

import { useActionState, useEffect, useRef } from "react";
import { Save } from "lucide-react";
import { Button, Input, Label, Select } from "@/components/ui";
import { setBudgetAction, type FormState } from "./actions";

export function BudgetForm({
  categories,
  fiscalYear,
}: {
  categories: { id: string; label: string }[];
  fiscalYear: number;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(setBudgetAction, {
    error: null,
  });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={formAction} className="grid gap-3 sm:grid-cols-12 sm:items-end">
      <input type="hidden" name="fiscalYear" value={fiscalYear} />
      <div className="sm:col-span-5">
        <Label htmlFor="b-cat">Categoria *</Label>
        <Select id="b-cat" name="categoryId" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor="b-amount">Orçamento {fiscalYear} (R$) *</Label>
        <Input id="b-amount" name="amount" type="number" step="0.01" min="0" required placeholder="0,00" />
      </div>
      <div className="sm:col-span-4">
        <Label htmlFor="b-notes">Observações</Label>
        <Input id="b-notes" name="notes" placeholder="Opcional" />
      </div>
      <div className="sm:col-span-12">
        <Button type="submit" disabled={pending}>
          <Save size={14} /> {pending ? "Salvando…" : "Definir orçamento"}
        </Button>
      </div>
      {state.error && <p className="text-sm text-red-600 sm:col-span-12">{state.error}</p>}
    </form>
  );
}
