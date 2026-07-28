"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import Link from "next/link";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Card, Button, Input, Label, Select, Textarea } from "@/components/ui";
import { fmtBRL } from "@/lib/utils";
import { createPurchaseOrderAction } from "./actions";

type Option = { id: string; label: string };

type ItemRow = { description: string; sku: string; quantity: number; unitPrice: number };
type FormValues = {
  poNumber: string;
  supplierId: string;
  currencyId: string;
  licenseeId: string;
  status: string;
  orderDate: string;
  expectedDate: string;
  incoterm: string;
  notes: string;
  purchaseContractId: string;
  purchaseCategoryId: string;
  items: ItemRow[];
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviado", label: "Enviado" },
  { value: "confirmado", label: "Confirmado" },
];

export function PurchaseOrderForm({
  suppliers,
  currencies,
  licensees,
  contracts = [],
  categories = [],
  defaultContractId = "",
}: {
  suppliers: Option[];
  currencies: Option[];
  licensees: Option[];
  contracts?: Option[];
  categories?: Option[];
  defaultContractId?: string;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      poNumber: "",
      supplierId: suppliers[0]?.id ?? "",
      currencyId: currencies[0]?.id ?? "",
      licenseeId: "",
      status: "rascunho",
      orderDate: "",
      expectedDate: "",
      incoterm: "",
      notes: "",
      purchaseContractId: defaultContractId,
      purchaseCategoryId: "",
      items: [{ description: "", sku: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");
  const total = (items ?? []).reduce(
    (a, it) => a + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0,
  );

  async function onSubmit(data: FormValues) {
    setServerError(null);
    setSubmitting(true);
    const res = await createPurchaseOrderAction({
      poNumber: data.poNumber,
      supplierId: data.supplierId,
      currencyId: data.currencyId,
      licenseeId: data.licenseeId,
      status: data.status,
      orderDate: data.orderDate,
      expectedDate: data.expectedDate,
      incoterm: data.incoterm,
      notes: data.notes,
      purchaseContractId: data.purchaseContractId,
      purchaseCategoryId: data.purchaseCategoryId,
      items: data.items.map((it) => ({
        description: it.description,
        sku: it.sku,
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unitPrice) || 0,
      })),
    });
    if (res && !res.ok) {
      setServerError(res.error);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl">
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Número do pedido *</Label>
            <Input placeholder="PO-2026-001" {...register("poNumber", { required: "Informe o número." })} />
            {errors.poNumber && <p className="mt-1 text-xs text-red-600">{errors.poNumber.message}</p>}
          </div>
          <div>
            <Label>Fornecedor *</Label>
            <Select {...register("supplierId", { required: true })}>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Moeda *</Label>
            <Select {...register("currencyId", { required: true })}>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Licenciado (opcional)</Label>
            <Select {...register("licenseeId")}>
              <option value="">— nenhum</option>
              {licensees.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Status inicial</Label>
            <Select {...register("status")}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Incoterm</Label>
            <Input placeholder="FOB / CIF / EXW" {...register("incoterm")} />
          </div>
          <div>
            <Label>Data do pedido</Label>
            <Input type="date" {...register("orderDate")} />
          </div>
          <div>
            <Label>Previsão de entrega</Label>
            <Input type="date" {...register("expectedDate")} />
          </div>
          <div>
            <Label>Contrato de compra (opcional)</Label>
            <Select {...register("purchaseContractId")}>
              <option value="">— nenhum</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Categoria de compra (opcional)</Label>
            <Select {...register("purchaseCategoryId")}>
              <option value="">— nenhuma</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Itens do pedido</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: "", sku: "", quantity: 1, unitPrice: 0 })}
          >
            <Plus size={14} /> Adicionar item
          </Button>
        </div>

        <div className="space-y-3">
          {fields.map((field, i) => {
            const qty = Number(items?.[i]?.quantity) || 0;
            const price = Number(items?.[i]?.unitPrice) || 0;
            return (
              <div
                key={field.id}
                className="grid grid-cols-1 gap-2 border-b border-neutral-100 pb-3 last:border-0 sm:grid-cols-12 sm:items-end dark:border-neutral-800"
              >
                <div className="sm:col-span-5">
                  <Label>Descrição *</Label>
                  <Input
                    placeholder="Ex.: Camiseta poliéster 180g"
                    {...register(`items.${i}.description` as const, { required: true })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>SKU</Label>
                  <Input {...register(`items.${i}.sku` as const)} />
                </div>
                <div className="sm:col-span-1">
                  <Label>Qtd.</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    {...register(`items.${i}.quantity` as const, { valueAsNumber: true })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label>Preço unit.</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register(`items.${i}.unitPrice` as const, { valueAsNumber: true })}
                  />
                </div>
                <div className="sm:col-span-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium tabular-nums">{fmtBRL(qty * price)}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => (fields.length > 1 ? remove(i) : null)}
                    disabled={fields.length <= 1}
                    aria-label="Remover item"
                  >
                    <Trash2 size={15} className="text-red-500" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-end gap-3 border-t border-neutral-200 pt-3 dark:border-neutral-800">
          <span className="text-sm text-neutral-500">Total do pedido</span>
          <span className="text-lg font-bold tabular-nums">{fmtBRL(total)}</span>
        </div>
      </Card>

      <div className="mt-4">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" {...register("notes")} />
      </div>

      {serverError && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {serverError}
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando…" : "Criar pedido"}
        </Button>
        <Link href="/compras">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
