"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { createItemAction, type FormState } from "./actions";

type Option = { id: string; label: string };

const UNIT_OPTIONS = ["un", "pc", "cx", "kg", "m", "par", "kit"];
const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "descontinuado", label: "Descontinuado" },
];

export function ItemForm({ categories, brands }: { categories: Option[]; brands: Option[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createItemAction, {
    error: null,
  });

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sku">SKU *</Label>
          <Input id="sku" name="sku" required placeholder="LP-CAM-001" />
        </div>
        <div>
          <Label htmlFor="name">Nome do item *</Label>
          <Input id="name" name="name" required placeholder="Camiseta Liga Prime branca" />
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
          <Label htmlFor="brandId">Marca</Label>
          <Select id="brandId" name="brandId" defaultValue="">
            <option value="">— (opcional)</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="unit">Unidade *</Label>
          <Select id="unit" name="unit" defaultValue="un">
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="listPrice">Preço de tabela</Label>
          <Input id="listPrice" name="listPrice" type="number" min="0" step="0.01" placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="ncm">NCM</Label>
          <Input id="ncm" name="ncm" placeholder="6109.10.00" />
        </div>
        <div>
          <Label htmlFor="cest">CEST</Label>
          <Input id="cest" name="cest" placeholder="28.038.00" />
        </div>
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select id="status" name="status" defaultValue="ativo">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" name="description" rows={2} placeholder="Detalhes do item, composição, tamanhos…" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Criar item"}
        </Button>
        <Link href="/catalogo">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
