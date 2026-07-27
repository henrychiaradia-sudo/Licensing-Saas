"use client";

import { useActionState } from "react";
import { Plus } from "lucide-react";
import { Button, Input, Label, Select } from "@/components/ui";
import { addQuoteAction } from "./actions";

export function QuoteForm({
  eventId,
  suppliers,
}: {
  eventId: string;
  suppliers: { id: string; label: string }[];
}) {
  const action = addQuoteAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-12 sm:items-end">
      <div className="sm:col-span-4">
        <Label htmlFor="q-supplier">Fornecedor *</Label>
        <Select id="q-supplier" name="supplierId" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor="q-amount">Valor da proposta *</Label>
        <Input id="q-amount" name="amount" type="number" step="0.01" min="0" required placeholder="0,00" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="q-lead">Lead time (d)</Label>
        <Input id="q-lead" name="leadTimeDays" type="number" min="0" step="1" />
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor="q-score">Score (0–5)</Label>
        <Input id="q-score" name="score" type="number" min="0" max="5" step="0.1" />
      </div>

      <div className="sm:col-span-3">
        <Label htmlFor="q-freight">Frete</Label>
        <Input id="q-freight" name="freightCost" type="number" min="0" step="0.01" placeholder="0,00" defaultValue="0" />
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor="q-tax">Impostos</Label>
        <Input id="q-tax" name="taxCost" type="number" min="0" step="0.01" placeholder="0,00" defaultValue="0" />
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor="q-other">Outros custos</Label>
        <Input id="q-other" name="otherCost" type="number" min="0" step="0.01" placeholder="0,00" defaultValue="0" />
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor="q-pay">Prazo pagto (d)</Label>
        <Input id="q-pay" name="paymentTermsDays" type="number" min="0" step="1" placeholder="30" />
      </div>

      <div className="sm:col-span-10">
        <Input name="notes" placeholder="Observações da proposta (opcional)" />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending} className="w-full">
          <Plus size={14} /> {pending ? "…" : "Adicionar"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-12">{state.error}</p>}
    </form>
  );
}
