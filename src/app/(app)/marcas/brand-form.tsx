"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import type { FormState } from "./actions";

type Initial = {
  code?: string;
  name?: string;
  ownerArea?: string | null;
  status?: string;
  language?: string | null;
  description?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
};

export function BrandForm({
  action,
  initial,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Initial;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">Código *</Label>
          <Input id="code" name="code" required defaultValue={initial?.code ?? ""} />
        </div>
        <div>
          <Label htmlFor="name">Nome *</Label>
          <Input id="name" name="name" required defaultValue={initial?.name ?? ""} />
        </div>
        <div>
          <Label htmlFor="ownerArea">Área responsável</Label>
          <Input id="ownerArea" name="ownerArea" defaultValue={initial?.ownerArea ?? ""} />
        </div>
        <div>
          <Label htmlFor="language">Idioma</Label>
          <Input id="language" name="language" defaultValue={initial?.language ?? ""} placeholder="pt-BR" />
        </div>
        <div>
          <Label htmlFor="validFrom">Válido de</Label>
          <Input id="validFrom" name="validFrom" type="date" defaultValue={initial?.validFrom ?? ""} />
        </div>
        <div>
          <Label htmlFor="validTo">Válido até</Label>
          <Input id="validTo" name="validTo" type="date" defaultValue={initial?.validTo ?? ""} />
        </div>
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select id="status" name="status" defaultValue={initial?.status ?? "ativo"}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="descontinuado">Descontinuado</option>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
        <Link href="/marcas">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
