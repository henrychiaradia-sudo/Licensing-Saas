"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Send, AlertCircle } from "lucide-react";
import { Card, Button, Input, Select, Label } from "@/components/ui";
import { submitProductAction } from "../actions";

type Brand = { id: string; name: string };
type Category = { id: string; name: string };

type FormValues = {
  brandId: string;
  categoryId: string;
  sku: string;
  name: string;
  productLine: string;
  material: string;
  color: string;
  supplierName: string;
  suggestedPrice: number;
};

export function ProductForm({ brands, categories }: { brands: Brand[]; categories: Category[] }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      brandId: brands[0]?.id ?? "",
      categoryId: "",
      sku: "",
      name: "",
      productLine: "",
      material: "",
      color: "",
      supplierName: "",
      suggestedPrice: 0,
    },
  });

  async function onSubmit(data: FormValues) {
    setServerError(null);
    setSubmitting(true);
    const res = await submitProductAction({
      brandId: data.brandId,
      categoryId: data.categoryId,
      sku: data.sku,
      name: data.name,
      productLine: data.productLine,
      material: data.material,
      color: data.color,
      supplierName: data.supplierName,
      suggestedPrice: Number(data.suggestedPrice) || 0,
    });
    // Em caso de sucesso o servidor redireciona; só chegamos aqui em erro.
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
            <Label>Marca *</Label>
            <Select {...register("brandId")}>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select {...register("categoryId")}>
              <option value="">— (opcional)</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>SKU *</Label>
            <Input placeholder="VB-CAMP-010" {...register("sku", { required: "Informe o SKU." })} />
            {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku.message}</p>}
          </div>
          <div>
            <Label>Nome do produto *</Label>
            <Input
              placeholder="Camiseta oficial NovaSport"
              {...register("name", { required: "Informe o nome do produto." })}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <Label>Linha</Label>
            <Input placeholder="Performance 2026" {...register("productLine")} />
          </div>
          <div>
            <Label>Material</Label>
            <Input placeholder="Poliéster / algodão" {...register("material")} />
          </div>
          <div>
            <Label>Cor</Label>
            <Input placeholder="Azul marinho" {...register("color")} />
          </div>
          <div>
            <Label>Fornecedor</Label>
            <Input placeholder="Confecção parceira" {...register("supplierName")} />
          </div>
          <div>
            <Label>Preço sugerido (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register("suggestedPrice", { valueAsNumber: true })}
            />
          </div>
        </div>
      </Card>

      {serverError && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {serverError}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={submitting || brands.length === 0}>
          <Send size={15} /> {submitting ? "Enviando…" : "Submeter para aprovação"}
        </Button>
        <p className="text-xs text-neutral-400">
          Ao submeter, o produto entra no fluxo das 8 alçadas de aprovação.
        </p>
      </div>
    </form>
  );
}
