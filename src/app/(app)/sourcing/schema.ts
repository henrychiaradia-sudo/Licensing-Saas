import { z } from "zod";

export const SOURCING_STATUS = ["aberto", "em_analise", "adjudicado", "cancelado"] as const;

export const sourcingEventSchema = z.object({
  title: z.string().trim().min(2, "Informe o título do RFQ.").max(200),
  categoryId: z.string().uuid().nullable(),
  dueDate: z.string().nullable(),
  status: z.enum(SOURCING_STATUS),
  baselineAmount: z.number().min(0).max(1_000_000_000).nullable(),
});

export const sourcingQuoteSchema = z.object({
  supplierId: z.string().uuid("Selecione um fornecedor."),
  amount: z.number().positive("Informe o valor da proposta.").max(1_000_000_000),
  leadTimeDays: z.number().int().min(0).max(3650).nullable(),
  score: z.number().min(0).max(5).nullable(),
  freightCost: z.number().min(0).max(1_000_000_000),
  taxCost: z.number().min(0).max(1_000_000_000),
  otherCost: z.number().min(0).max(1_000_000_000),
  paymentTermsDays: z.number().int().min(0).max(365).nullable(),
  notes: z.string().trim().max(500).nullable(),
});

export const weightsSchema = z
  .object({
    price: z.number().int().min(0).max(100),
    lead: z.number().int().min(0).max(100),
    quality: z.number().int().min(0).max(100),
    payment: z.number().int().min(0).max(100),
  })
  .refine((w) => w.price + w.lead + w.quality + w.payment > 0, {
    message: "Defina ao menos um peso maior que zero.",
  });
