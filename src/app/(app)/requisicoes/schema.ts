import { z } from "zod";

export const reqItemSchema = z.object({
  description: z.string().trim().min(1, "Descreva o item.").max(240),
  sku: z.string().trim().max(60).optional().default(""),
  quantity: z.coerce.number().min(0).max(1_000_000_000).default(0),
  estimatedUnitPrice: z.coerce.number().min(0).max(1_000_000_000).default(0),
});

export const requisitionSchema = z.object({
  title: z.string().trim().min(2, "Informe o título da requisição.").max(200),
  justification: z.string().trim().max(2000).optional().default(""),
  neededBy: z.string().optional().default(""),
  status: z.enum(["rascunho", "enviada"]).default("rascunho"),
  items: z.array(reqItemSchema).min(1, "Inclua ao menos um item."),
});

export type RequisitionFormInput = z.infer<typeof requisitionSchema>;
