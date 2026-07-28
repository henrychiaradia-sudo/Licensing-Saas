"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { fmtBRL, fmtPct } from "@/lib/utils";
import { computeCost, COST_GROUPS, COST_FIELD_KEYS, type CostInput } from "@/lib/costing";
import type { FormState } from "./actions";

type Option = { id: string; label: string };
export type CostDefaults = Partial<Record<string, string | number | null>>;

const NUM_LABEL: Record<string, string> = Object.fromEntries(
  COST_GROUPS.flatMap((g) => g.fields.map((f) => [f.key, f.label])),
);

export function CostForm({
  action,
  products,
  suppliers,
  defaults,
  submitLabel = "Criar ficha",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  products: Option[];
  suppliers: Option[];
  defaults?: CostDefaults;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });
  const d = defaults ?? {};

  // Estado numérico para o preview ao vivo
  const initNums: Record<string, number> = {};
  for (const k of COST_FIELD_KEYS) initNums[k] = Number(d[k] ?? 0) || 0;
  const [nums, setNums] = useState<Record<string, number>>(initNums);
  const setNum = (k: string, v: string) => setNums((s) => ({ ...s, [k]: Number(v) || 0 }));

  const result = computeCost(nums as unknown as CostInput);

  const numField = (key: string) => (
    <div key={key}>
      <Label htmlFor={key}>{NUM_LABEL[key] ?? key}</Label>
      <Input
        id={key}
        name={key}
        type="number"
        step="0.0001"
        min="0"
        defaultValue={d[key] != null ? String(d[key]) : ""}
        onChange={(e) => setNum(key, e.target.value)}
        placeholder="0,00"
        className="h-9"
      />
    </div>
  );

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      {/* Coluna esquerda: campos */}
      <div className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="name">Nome da ficha *</Label>
            <Input id="name" name="name" required defaultValue={(d.name as string) ?? ""} placeholder="Camiseta Pro Aurora — importação" />
          </div>
          <div>
            <Label htmlFor="productId">Produto</Label>
            <Select id="productId" name="productId" defaultValue={(d.productId as string) ?? ""}>
              <option value="">— (opcional)</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="supplierId">Fornecedor</Label>
            <Select id="supplierId" name="supplierId" defaultValue={(d.supplierId as string) ?? ""}>
              <option value="">— (opcional)</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" name="sku" defaultValue={(d.sku as string) ?? ""} placeholder="SKU-000" />
          </div>
          <div>
            <Label htmlFor="currency">Moeda</Label>
            <Input id="currency" name="currency" defaultValue={(d.currency as string) ?? "BRL"} placeholder="BRL" />
          </div>
        </div>

        {COST_GROUPS.map((g) => (
          <div key={g.group}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              {g.group}
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">{g.fields.map((f) => numField(f.key))}</div>
          </div>
        ))}

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">Precificação</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="markupPct">Markup (%)</Label>
              <Input
                id="markupPct"
                name="markupPct"
                type="number"
                step="0.01"
                min="0"
                defaultValue={d.markupPct != null ? String(d.markupPct) : ""}
                onChange={(e) => setNum("markupPct", e.target.value)}
                placeholder="0"
                className="h-9"
              />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" name="notes" rows={2} defaultValue={(d.notes as string) ?? ""} placeholder="Premissas, NCM, câmbio…" />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Salvando…" : submitLabel}
          </Button>
          <Link href="/custos">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </div>

      {/* Coluna direita: preview ao vivo */}
      <div className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <h3 className="text-sm font-semibold">Resultado (ao vivo)</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <Row label="CIF (FOB + frete + seguro)" value={fmtBRL(result.cif)} />
            <Row label="Impostos" value={fmtBRL(result.impostos)} />
            <Row label="Custos de importação" value={fmtBRL(result.custosImportacao)} />
            <Row label="Outros custos" value={fmtBRL(result.outrosCustos)} />
          </dl>
          <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
            <Row label="Custo total" value={fmtBRL(result.custoTotal)} strong />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-neutral-500">Preço sugerido</span>
              <span className="text-lg font-bold tabular-nums text-blue-600 dark:text-blue-400">
                {fmtBRL(result.precoSugerido)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-sm">
              <span className="text-neutral-500">Margem</span>
              <span className="font-semibold tabular-nums text-emerald-600">
                {fmtPct(result.margemPct, 1)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd className={strong ? "font-bold tabular-nums" : "font-medium tabular-nums"}>{value}</dd>
    </div>
  );
}
