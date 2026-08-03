"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select } from "@/components/ui";
import { createGradeAction, type FormState } from "../catalogo/actions";

type Option = { id: string; label: string };

export function GradeForm({ categories }: { categories: Option[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createGradeAction, {
    error: null,
  });

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-4 sm:items-end">
      <div>
        <Label htmlFor="grade-category">Categoria *</Label>
        <Select id="grade-category" name="categoryId" defaultValue="" required>
          <option value="">— selecione</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="grade-name">Grade / Subtipo *</Label>
        <Input id="grade-name" name="name" required placeholder="Aba Reta" />
      </div>
      <div>
        <Label htmlFor="grade-code">Código</Label>
        <Input id="grade-code" name="code" placeholder="(opcional)" />
      </div>
      <div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Salvando…" : "Adicionar grade"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-4">{state.error}</p>}
    </form>
  );
}
