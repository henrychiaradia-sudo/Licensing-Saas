import { z } from "zod";

export const SUPPLY_STATUS = ["rascunho", "vigente", "suspenso", "encerrado", "renovado"] as const;

export const supplyContractSchema = z.object({
  title: z.string().trim().min(3, "Informe o título do contrato.").max(200),
  supplierId: z.string().uuid("Selecione o fornecedor."),
  status: z.enum(SUPPLY_STATUS),
  categoryId: z.string().uuid().nullable(),
  currency: z.string().trim().min(3).max(3),
  totalValue: z.number().min(0).max(1_000_000_000_000),
  sla: z.string().trim().max(500).nullable(),
  paymentTerms: z.string().trim().max(200).nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  autoRenew: z.boolean(),
  notes: z.string().trim().max(2000).nullable(),
});
