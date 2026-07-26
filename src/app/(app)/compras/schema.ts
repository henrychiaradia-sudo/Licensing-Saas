import { z } from "zod";

export const PO_STATUS = [
  "rascunho",
  "enviado",
  "confirmado",
  "em_producao",
  "embarcado",
  "recebido",
  "cancelado",
] as const;

export const poItemSchema = z.object({
  description: z.string().trim().min(1, "Descreva o item.").max(240),
  sku: z.string().trim().max(60).optional().default(""),
  quantity: z.coerce.number().min(0).max(1_000_000_000).default(0),
  unitPrice: z.coerce.number().min(0).max(1_000_000_000).default(0),
});

export const purchaseOrderSchema = z.object({
  poNumber: z.string().trim().min(2, "Informe o número do pedido.").max(60),
  supplierId: z.string().uuid("Selecione um fornecedor."),
  currencyId: z.string().uuid("Selecione a moeda."),
  licenseeId: z.string().uuid().optional().or(z.literal("")).default(""),
  status: z.enum(PO_STATUS).default("rascunho"),
  orderDate: z.string().optional().default(""),
  expectedDate: z.string().optional().default(""),
  incoterm: z.string().trim().max(20).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  items: z.array(poItemSchema).min(1, "Inclua ao menos um item."),
});

export type PurchaseOrderFormInput = z.infer<typeof purchaseOrderSchema>;
