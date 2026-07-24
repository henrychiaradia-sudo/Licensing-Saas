"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Send, AlertCircle } from "lucide-react";
import { Card, Button, Input, Label } from "@/components/ui";
import { resubmitProductAction } from "../../actions";

type FormValues = {
  name: string;
  productLine: string;
  material: string;
  color: string;
  supplierName: string;
  suggestedPrice: number | string;
};

export function ResubmitForm({
  productId,
  sku,
  brandName,
  initial,
}: {
  productId: string;
  sku: string;
  brandName: string;
  initial: FormValues;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: initial });

  async function onSubmit(data: FormValues) {
    setServerError(null);
    setSubmitting(true);
    const res = await resubmitProductAction(productId, {
      name: data.name,
      productLine: data.productLine,
      material: data.material,
      color: data.color,
      supplierName: data.supplierName,
      suggestedPrice: Number(data.suggestedPrice) || 0,
    });
    if (res && !res.ok) {
      setServerError(res.error);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>SKU</Label>
            <Input defaultValue={sku} disabled />
          </div>
          <div>
            <Label>Marca</Label>
            <Input defaultValue={brandName} disabled />
          </div>
          <div>
            <Label>Nome do produto *</Label>
            <Input {...register("name", { required: "Informe o nome do produto." })} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <Label>Linha</Label>
            <Input {...register("productLine")} />
          </div>
          <div>
            <Label>Material</Label>
            <Input {...register("material")} />
          </div>
          <div>
            <Label>Cor</Label>
            <Input {...register("color")} />
          </div>
          <div>
            <Label>Fornecedor</Label>
            <Input {...register("supplierName")} />
          </div>
          <div>
            <Label>Preço sugerido (R$)</Label>
            <Input type="number" step="0.01" min="0" {...register("suggestedPrice", { valueAsNumber: true })} />
          </div>
        </div>
      </Card>

      {serverError && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {serverError}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          <Send size={15} /> {submitting ? "Enviando…" : "Reenviar nova versão"}
        </Button>
        <p className="text-xs text-neutral-400">
          Ao reenviar, criamos uma nova versão e reiniciamos as 8 alçadas de aprovação.
        </p>
      </div>
    </form>
  );
}
