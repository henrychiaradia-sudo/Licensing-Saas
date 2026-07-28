import { z } from "zod";

export const PURCHASE_CONTRACT_STATUS = ["rascunho", "vigente", "suspenso", "encerrado"] as const;

export const purchaseContractSchema = z.object({
  title: z.string().trim().min(2, "Informe o título do contrato.").max(200),
  supplierId: z.string().uuid("Selecione o fornecedor."),
  supplyContractId: z.string().uuid().nullable(),
  status: z.enum(PURCHASE_CONTRACT_STATUS),
  currency: z.string().trim().min(3).max(3),
  committedValue: z.number().min(0, "Valor inválido.").max(1_000_000_000_000),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  paymentTerms: z.string().trim().max(200).nullable(),
  notes: z.string().trim().max(1000).nullable(),
});
