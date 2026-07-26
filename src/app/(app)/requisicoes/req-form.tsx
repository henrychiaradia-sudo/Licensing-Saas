"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import Link from "next/link";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Card, Button, Input, Label, Textarea } from "@/components/ui";
import { fmtBRL } from "@/lib/utils";
import { createRequisitionAction } from "./actions";

type ItemRow = { description: string; sku: string; quantity: number; estimatedUnitPrice: number };
type FormValues = {
  title: string;
  justification: string;
  neededBy: string;
  items: ItemRow[];
};

export function RequisitionForm() {
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
      title: "",
      justification: "",
      neededBy: "",
      items: [{ description: "", sku: "", quantity: 1, estimatedUnitPrice: 0 }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const items = watch("items");
  const total = (items ?? []).reduce(
    (a, it) => a + (Number(it.quantity) || 0) * (Number(it.estimatedUnitPrice) || 0),
    0,
  );

  async function onSubmit(data: FormValues) {
    setServerError(null);
    setSubmitting(true);
    const res = await createRequisitionAction({
      title: data.title,
      justification: data.justification,
      neededBy: data.neededBy,
      status: "rascunho",
      items: data.items.map((it) => ({
        description: it.description,
        sku: it.sku,
        quantity: Number(it.quantity) || 0,
        estimatedUnitPrice: Number(it.estimatedUnitPrice) || 0,
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
        <div className="grid gap-4">
          <div>
            <Label>Título da requisição *</Label>
            <Input
              placeholder="Ex.: Insumos para coleção Verão 2026"
              {...register("title", { required: "Informe o título." })}
            />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Necessário até</Label>
              <Input type="date" {...register("neededBy")} />
            </div>
          </div>
          <div>
            <Label>Justificativa</Label>
            <Textarea placeholder="Motivo da compra, área solicitante, urgência…" {...register("justification")} />
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Itens solicitados</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ description: "", sku: "", quantity: 1, estimatedUnitPrice: 0 })}
          >
            <Plus size={14} /> Adicionar item
          </Button>
        </div>
        <div className="space-y-3">
          {fields.map((field, i) => {
            const qty = Number(items?.[i]?.quantity) || 0;
            const price = Number(items?.[i]?.estimatedUnitPrice) || 0;
            return (
              <div
                key={field.id}
                className="grid grid-cols-1 gap-2 border-b border-neutral-100 pb-3 last:border-0 sm:grid-cols-12 sm:items-end dark:border-neutral-800"
              >
                <div className="sm:col-span-5">
                  <Label>Descrição *</Label>
                  <Input {...register(`items.${i}.description` as const, { required: true })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>SKU</Label>
                  <Input {...register(`items.${i}.sku` as const)} />
                </div>
                <div className="sm:col-span-1">
                  <Label>Qtd.</Label>
                  <Input type="number" step="1" min="0" {...register(`items.${i}.quantity` as const, { valueAsNumber: true })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Preço est.</Label>
                  <Input type="number" step="0.01" min="0" {...register(`items.${i}.estimatedUnitPrice` as const, { valueAsNumber: true })} />
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
          <span className="text-sm text-neutral-500">Estimativa total</span>
          <span className="text-lg font-bold tabular-nums">{fmtBRL(total)}</span>
        </div>
      </Card>

      {serverError && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {serverError}
        </div>
      )}

      <div className="mt-5 flex gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando…" : "Criar requisição"}
        </Button>
        <Link href="/requisicoes">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
