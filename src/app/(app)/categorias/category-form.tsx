"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import { createCategoryAction, type FormState } from "../catalogo/actions";

type Option = { id: string; label: string };

export function CategoryForm({ parents }: { parents: Option[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createCategoryAction, {
    error: null,
  });

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-4 sm:items-end">
      <div>
        <Label htmlFor="cat-name">Nome *</Label>
        <Input id="cat-name" name="name" required placeholder="Vestuário" />
      </div>
      <div>
        <Label htmlFor="cat-code">Código</Label>
        <Input id="cat-code" name="code" placeholder="VEST" />
      </div>
      <div>
        <Label htmlFor="cat-parent">Categoria-mãe</Label>
        <Select id="cat-parent" name="parentId" defaultValue="">
          <option value="">— (raiz)</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Salvando…" : "Adicionar categoria"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-4">{state.error}</p>}
    </form>
  );
}
