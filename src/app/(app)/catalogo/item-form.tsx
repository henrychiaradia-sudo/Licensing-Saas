"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import type { FormState } from "./actions";

type Option = { id: string; label: string };
type GradeOption = { id: string; name: string; categoryId: string | null };

const UNIT_OPTIONS = ["un", "pc", "cx", "kg", "m", "par", "kit"];
const STATUS_OPTIONS = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "descontinuado", label: "Descontinuado" },
];
const AUDIENCE_OPTIONS = [
  { value: "masculino", label: "Masculino" },
  { value: "feminino", label: "Feminino" },
  { value: "infantil", label: "Infantil" },
  { value: "unissex", label: "Unissex" },
];

export type ItemInitial = {
  sku?: string;
  name?: string;
  description?: string | null;
  categoryId?: string | null;
  brandId?: string | null;
  ncm?: string | null;
  cest?: string | null;
  unit?: string;
  listPrice?: number | string | null;
  costPrice?: number | string | null;
  publico?: string | null;
  grade?: string | null;
  gradeId?: string | null;
  pantone?: string | null;
  upi?: string | null;
  upc?: string | null;
  discontinuationReason?: string | null;
  status?: string;
};

export function ItemForm({
  action,
  categories,
  brands,
  grades,
  initial,
  submitLabel = "Criar item",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  categories: Option[];
  brands: Option[];
  grades: GradeOption[];
  initial?: ItemInitial;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });
  const num = (v: number | string | null | undefined) => (v == null ? "" : String(v));

  // Categoria controla a grade (subtipo estruturado): ao trocar a categoria, filtramos as grades.
  const [categoryId, setCategoryId] = useState<string>(initial?.categoryId ?? "");
  const [gradeId, setGradeId] = useState<string>(initial?.gradeId ?? "");
  const gradeChoices = grades.filter((g) => g.categoryId === categoryId || g.categoryId == null);

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="sku">SKU *</Label>
          <Input id="sku" name="sku" required placeholder="LP-CAM-001" defaultValue={initial?.sku ?? ""} />
        </div>
        <div>
          <Label htmlFor="name">Nome do item *</Label>
          <Input id="name" name="name" required placeholder="Camiseta Liga Prime branca" defaultValue={initial?.name ?? ""} />
        </div>
        <div>
          <Label htmlFor="categoryId">Categoria / Subcategoria</Label>
          <Select
            id="categoryId"
            name="categoryId"
            value={categoryId}
            onChange={(e) => {
              const next = e.target.value;
              setCategoryId(next);
              // Se a grade atual não pertence à nova categoria, limpa a seleção.
              const stillValid = grades.some(
                (g) => g.id === gradeId && (g.categoryId === next || g.categoryId == null),
              );
              if (!stillValid) setGradeId("");
            }}
          >
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
          <Select id="brandId" name="brandId" defaultValue={initial?.brandId ?? ""}>
            <option value="">— (opcional)</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="gradeId">Grade / Subtipo</Label>
          <Select
            id="gradeId"
            name="gradeId"
            value={gradeId}
            onChange={(e) => setGradeId(e.target.value)}
            disabled={!categoryId && gradeChoices.length === 0}
          >
            <option value="">
              {!categoryId ? "Selecione uma categoria primeiro" : "— (opcional)"}
            </option>
            {gradeChoices.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-[11px] text-neutral-400">
            Subtipo estruturado da categoria (ex.: Bonés → Aba Reta, Trucker). Cadastre novas grades em Categorias.
          </p>
        </div>
        <div>
          <Label htmlFor="publico">Público</Label>
          <Select id="publico" name="publico" defaultValue={initial?.publico ?? ""}>
            <option value="">— (opcional)</option>
            {AUDIENCE_OPTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="unit">Unidade *</Label>
          <Select id="unit" name="unit" defaultValue={initial?.unit ?? "un"}>
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select id="status" name="status" defaultValue={initial?.status ?? "ativo"}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="listPrice">Preço de tabela</Label>
          <Input id="listPrice" name="listPrice" type="number" min="0" step="0.01" placeholder="0,00" defaultValue={num(initial?.listPrice)} />
        </div>
        <div>
          <Label htmlFor="costPrice">Preço de custo</Label>
          <Input id="costPrice" name="costPrice" type="number" min="0" step="0.01" placeholder="0,00" defaultValue={num(initial?.costPrice)} />
        </div>
        <div>
          <Label htmlFor="pantone">Cor Pantone</Label>
          <Input id="pantone" name="pantone" placeholder="PANTONE 186 C" defaultValue={initial?.pantone ?? ""} />
        </div>
        <div>
          <Label htmlFor="upi">UPI</Label>
          <Input id="upi" name="upi" placeholder="Código UPI" defaultValue={initial?.upi ?? ""} />
        </div>
        <div>
          <Label htmlFor="upc">UPC</Label>
          <Input id="upc" name="upc" placeholder="Código de barras (UPC)" defaultValue={initial?.upc ?? ""} />
        </div>
        <div>
          <Label htmlFor="ncm">NCM</Label>
          <Input id="ncm" name="ncm" placeholder="6109.10.00" defaultValue={initial?.ncm ?? ""} />
        </div>
        <div>
          <Label htmlFor="cest">CEST</Label>
          <Input id="cest" name="cest" placeholder="28.038.00" defaultValue={initial?.cest ?? ""} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" name="description" rows={2} placeholder="Detalhes do item, composição, tamanhos…" defaultValue={initial?.description ?? ""} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="discontinuationReason">Motivo de descontinuação (se aplicável)</Label>
          <Textarea
            id="discontinuationReason"
            name="discontinuationReason"
            rows={2}
            placeholder="Preencha quando o status for “Descontinuado”."
            defaultValue={initial?.discontinuationReason ?? ""}
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
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
