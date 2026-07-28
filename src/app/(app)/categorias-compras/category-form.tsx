"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import type { FormState } from "./actions";
import { NATURE_OPTIONS, STATUS_OPTIONS, natureHint } from "./labels";
import type { SpendNature } from "@/lib/db/schema";

export type CategoryDefaults = {
  code?: string;
  name?: string;
  nature?: string;
  ownerName?: string | null;
  annualBudget?: string | number | null;
  strategy?: string | null;
  status?: string;
  notes?: string | null;
};

export function CategoryForm({
  action,
  defaults,
  submitLabel = "Criar categoria",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  defaults?: CategoryDefaults;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });
  const d = defaults ?? {};

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">Código *</Label>
          <Input id="code" name="code" required defaultValue={d.code ?? ""} placeholder="COMP-MP" />
        </div>
        <div>
          <Label htmlFor="name">Nome da categoria *</Label>
          <Input id="name" name="name" required defaultValue={d.name ?? ""} placeholder="Matéria-prima" />
        </div>
        <div>
          <Label htmlFor="nature">Natureza *</Label>
          <Select id="nature" name="nature" defaultValue={d.nature ?? "opex"}>
            {NATURE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label} — {natureHint[o.value as SpendNature]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select id="status" name="status" defaultValue={d.status ?? "ativa"}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="ownerName">Responsável (comprador)</Label>
          <Input id="ownerName" name="ownerName" defaultValue={d.ownerName ?? ""} placeholder="Nome do category manager" />
        </div>
        <div>
          <Label htmlFor="annualBudget">Orçamento anual (R$)</Label>
          <Input
            id="annualBudget"
            name="annualBudget"
            type="number"
            min="0"
            step="0.01"
            defaultValue={d.annualBudget != null ? String(d.annualBudget) : ""}
            placeholder="0,00"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="strategy">Estratégia da categoria</Label>
          <Textarea id="strategy" name="strategy" rows={2} defaultValue={d.strategy ?? ""} placeholder="Diretrizes de sourcing, alavancas de economia, riscos…" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" name="notes" rows={2} defaultValue={d.notes ?? ""} placeholder="Notas internas…" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </Button>
        <Link href="/categorias-compras">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
