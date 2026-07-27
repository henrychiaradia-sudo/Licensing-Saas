"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select } from "@/components/ui";
import { createSourcingEventAction } from "./actions";

export function EventForm({ categories }: { categories: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(createSourcingEventAction, { error: null });

  return (
    <form action={formAction} className="grid max-w-2xl gap-5">
      <div>
        <Label htmlFor="title">Título do RFQ *</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Ex.: Camisetas oficiais — coleção 2026"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
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
          <Label htmlFor="dueDate">Prazo para propostas</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
      </div>
      <div>
        <Label htmlFor="baselineAmount">Orçamento base (baseline)</Label>
        <Input id="baselineAmount" name="baselineAmount" type="number" min="0" step="0.01" placeholder="Ex.: 100000" />
        <p className="mt-1 text-xs text-neutral-400">
          Valor de referência antes da negociação. Usado para calcular o savings ao adjudicar.
        </p>
      </div>
      <input type="hidden" name="status" value="aberto" />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Criando…" : "Criar RFQ"}
        </Button>
        <Link href="/sourcing">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
