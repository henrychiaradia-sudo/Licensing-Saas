import { z } from "zod";

export const CATALOG_STATUS = ["ativo", "inativo", "descontinuado"] as const;
export const UNIT_OPTIONS = ["un", "pc", "cx", "kg", "m", "par", "kit"] as const;

export const itemSchema = z.object({
  sku: z.string().trim().min(1, "Informe o SKU.").max(60),
  name: z.string().trim().min(2, "Informe o nome do item.").max(200),
  description: z.string().trim().max(1000).nullable(),
  categoryId: z.string().uuid().nullable(),
  brandId: z.string().uuid().nullable(),
  ncm: z.string().trim().max(20).nullable(),
  cest: z.string().trim().max(20).nullable(),
  unit: z.enum(UNIT_OPTIONS),
  listPrice: z.number().min(0).max(10_000_000_000),
  status: z.enum(CATALOG_STATUS),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria.").max(120),
  code: z.string().trim().max(40).nullable(),
  parentId: z.string().uuid().nullable(),
});
