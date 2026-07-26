import { z } from "zod";

export const SUPPLIER_CATEGORY = [
  "materia_prima",
  "manufatura",
  "embalagem",
  "logistica",
  "servicos",
  "marketing",
  "tecnologia",
] as const;

export const SUPPLIER_STATUS = ["em_homologacao", "ativo", "inativo", "bloqueado"] as const;

export const supplierSchema = z.object({
  code: z.string().trim().min(2, "Informe o código.").max(40),
  legalName: z.string().trim().min(2, "Informe a razão social.").max(200),
  tradeName: z.string().trim().max(200).nullable(),
  category: z.enum(SUPPLIER_CATEGORY),
  countryId: z.string().uuid().nullable(),
  city: z.string().trim().max(120).nullable(),
  status: z.enum(SUPPLIER_STATUS),
  rating: z.number().min(0).max(5).nullable(),
  leadTimeDays: z.number().int().min(0).max(3650).nullable(),
  paymentTerms: z.string().trim().max(120).nullable(),
  email: z.string().trim().max(160).nullable(),
  phone: z.string().trim().max(60).nullable(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;
