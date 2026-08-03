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
  imageUrl: string;
  barcode: string;
  upi: string;
  logoCode: string;
  pantone: string;
  technologies: string;
};

export function ProductForm({ brands, categories }: { brands: Brand[]; categories: Category[] }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
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
      imageUrl: "",
      barcode: "",
      upi: "",
      logoCode: "",
      pantone: "",
      technologies: "",
    },
  });
  const imageUrl = watch("imageUrl");

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
      imageUrl: data.imageUrl?.trim() ?? "",
      barcode: data.barcode,
      upi: data.upi,
      logoCode: data.logoCode,
      pantone: data.pantone,
      technologies: data.technologies,
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
            <Label>Preço sugerido — MSRP (R$)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              {...register("suggestedPrice", { valueAsNumber: true })}
            />
          </div>
          <div>
            <Label>UPC (código de barras)</Label>
            <Input placeholder="7891234567890" {...register("barcode")} />
          </div>
          <div>
            <Label>UPI</Label>
            <Input placeholder="Código UPI" {...register("upi")} />
          </div>
          <div>
            <Label>Código do Logo</Label>
            <Input placeholder="LOGO-0001" {...register("logoCode")} />
          </div>
          <div>
            <Label>Cor Pantone</Label>
            <Input placeholder="PANTONE 186 C" {...register("pantone")} />
          </div>
          <div className="sm:col-span-2">
            <Label>Tecnologias aplicadas</Label>
            <Input placeholder="Dry-Fit, Proteção UV, Antiodor" {...register("technologies")} />
            <p className="mt-1 text-xs text-neutral-400">Separe por vírgula.</p>
          </div>
          <div className="sm:col-span-2">
            <Label>Imagem / arte do produto (URL)</Label>
            <Input
              placeholder="https://…/arte-do-produto.png"
              {...register("imageUrl")}
            />
            <p className="mt-1 text-xs text-neutral-400">
              Cole o link público de uma imagem (PNG/JPG). O time de aprovação verá a arte anexada.
            </p>
            {imageUrl && /^https?:\/\//i.test(imageUrl.trim()) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl.trim()}
                alt="Prévia da arte"
                className="mt-3 max-h-48 rounded-lg border border-neutral-200 object-contain dark:border-neutral-700"
              />
            )}
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
