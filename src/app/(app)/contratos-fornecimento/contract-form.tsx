"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { createSupplyContractAction, type FormState } from "./actions";

type Option = { id: string; label: string };

const STATUS_OPTIONS = [
  { value: "rascunho", label: "Rascunho" },
  { value: "vigente", label: "Vigente" },
  { value: "suspenso", label: "Suspenso" },
];

export function SupplyContractForm({
  suppliers,
  categories,
}: {
  suppliers: Option[];
  categories: Option[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createSupplyContractAction,
    { error: null },
  );

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="title">Título / objeto *</Label>
          <Input id="title" name="title" required placeholder="Fornecimento de malha PV — 2026/2027" />
        </div>
        <div>
          <Label htmlFor="supplierId">Fornecedor *</Label>
          <Select id="supplierId" name="supplierId" required defaultValue="">
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
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select id="status" name="status" defaultValue="rascunho">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="categoryId">Categoria</Label>
          <Select id="categoryId" name="categoryId" defaultValue="">
            <option value="">— (opcional)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="currency">Moeda</Label>
          <Select id="currency" name="currency" defaultValue="BRL">
            <option value="BRL">BRL (R$)</option>
            <option value="USD">USD (US$)</option>
            <option value="EUR">EUR (€)</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="totalValue">Valor total do contrato</Label>
          <Input id="totalValue" name="totalValue" type="number" min="0" step="0.01" placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="paymentTerms">Condição de pagamento</Label>
          <Input id="paymentTerms" name="paymentTerms" placeholder="Ex.: 30/60/90 dias" />
        </div>
        <div>
          <Label htmlFor="startDate">Início da vigência</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>
        <div>
          <Label htmlFor="endDate">Fim da vigência</Label>
          <Input id="endDate" name="endDate" type="date" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="sla">SLA / nível de serviço</Label>
          <Input id="sla" name="sla" placeholder="Ex.: entrega em até 15 dias, OTIF ≥ 95%" />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            id="autoRenew"
            name="autoRenew"
            type="checkbox"
            className="h-4 w-4 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
          />
          <Label htmlFor="autoRenew" className="mb-0">
            Renovação automática
          </Label>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" name="notes" rows={3} placeholder="Cláusulas relevantes, escopo, penalidades…" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Criar contrato"}
        </Button>
        <Link href="/contratos-fornecimento">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
