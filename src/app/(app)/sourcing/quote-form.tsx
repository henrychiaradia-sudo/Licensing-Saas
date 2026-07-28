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
      <div className="sm:col-span-5">
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
      <div className="sm:col-span-2">
        <Label htmlFor="q-moq">MOQ (mín.)</Label>
        <Input id="q-moq" name="moq" type="number" min="0" step="1" placeholder="un." />
      </div>

      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 sm:col-span-12">
        Avaliação técnica
      </p>
      <div className="sm:col-span-3">
        <Label htmlFor="q-score">Qualidade (0–5)</Label>
        <Input id="q-score" name="score" type="number" min="0" max="5" step="0.1" placeholder="4,5" />
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor="q-capacity">Capacidade (0–100)</Label>
        <Input id="q-capacity" name="capacityScore" type="number" min="0" max="100" step="1" placeholder="80" />
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor="q-compliance">Compliance (0–100)</Label>
        <Input id="q-compliance" name="complianceScore" type="number" min="0" max="100" step="1" placeholder="90" />
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor="q-performance">Performance (0–100)</Label>
        <Input id="q-performance" name="performanceScore" type="number" min="0" max="100" step="1" placeholder="85" />
      </div>

      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 sm:col-span-12">
        Custos & condições
      </p>
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

      <div className="sm:col-span-6">
        <Label htmlFor="q-attach">Anexo (URL da proposta)</Label>
        <Input id="q-attach" name="attachmentUrl" type="url" placeholder="https://…" />
      </div>
      <div className="sm:col-span-6">
        <Label htmlFor="q-notes">Observações</Label>
        <Input id="q-notes" name="notes" placeholder="Observações da proposta (opcional)" />
      </div>

      <div className="sm:col-span-12">
        <Button type="submit" disabled={pending}>
          <Plus size={14} /> {pending ? "Adicionando…" : "Adicionar proposta"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-12">{state.error}</p>}
    </form>
  );
}
