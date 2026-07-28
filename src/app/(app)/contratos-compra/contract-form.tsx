"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { createPurchaseContractAction } from "./actions";

type Option = { id: string; label: string };

export function ContractForm({
  suppliers,
  supplyContracts,
}: {
  suppliers: Option[];
  supplyContracts: Option[];
}) {
  const [state, formAction, pending] = useActionState(createPurchaseContractAction, { error: null });

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div>
        <Label htmlFor="title">Título do contrato *</Label>
        <Input id="title" name="title" required placeholder="Ex.: Fornecimento de malha PV 2026-2027" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
          <Label htmlFor="supplyContractId">Contrato de fornecimento (opcional)</Label>
          <Select id="supplyContractId" name="supplyContractId" defaultValue="">
            <option value="">— nenhum</option>
            {supplyContracts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="committedValue">Valor comprometido *</Label>
          <Input id="committedValue" name="committedValue" type="number" step="0.01" min="0" required placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="currency">Moeda</Label>
          <Select id="currency" name="currency" defaultValue="BRL">
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="CNY">CNY</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue="vigente">
            <option value="rascunho">Rascunho</option>
            <option value="vigente">Vigente</option>
            <option value="suspenso">Suspenso</option>
            <option value="encerrado">Encerrado</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="startDate">Início da vigência</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>
        <div>
          <Label htmlFor="endDate">Fim da vigência</Label>
          <Input id="endDate" name="endDate" type="date" />
        </div>
        <div>
          <Label htmlFor="paymentTerms">Condição de pagamento</Label>
          <Input id="paymentTerms" name="paymentTerms" placeholder="Ex.: 30/60 dias" />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={3} placeholder="Escopo, condições e cláusulas relevantes…" />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Criando…" : "Criar contrato"}
        </Button>
        <Link href="/contratos-compra">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
