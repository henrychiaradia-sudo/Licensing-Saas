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
  notes: z.string().trim().max(500).nullable(),
});
