import { z } from "zod";

export const NATURE = ["capex", "opex", "mro"] as const;
export const STATUS = ["ativa", "inativa"] as const;

export const categorySchema = z.object({
  code: z.string().trim().min(1, "Informe o código.").max(40),
  name: z.string().trim().min(2, "Informe o nome da categoria.").max(160),
  nature: z.enum(NATURE),
  ownerName: z.string().trim().max(160).nullable(),
  annualBudget: z.number().min(0).max(1_000_000_000_000),
  strategy: z.string().trim().max(2000).nullable(),
  status: z.enum(STATUS),
  notes: z.string().trim().max(2000).nullable(),
});
