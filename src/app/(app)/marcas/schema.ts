import { z } from "zod";

export const brandSchema = z.object({
  code: z.string().trim().min(2, "Informe o código."),
  name: z.string().trim().min(2, "Informe o nome."),
  ownerArea: z.string().trim().optional(),
  status: z.enum(["ativo", "inativo", "descontinuado"]),
  language: z.string().trim().optional(),
  description: z.string().trim().optional(),
  validFrom: z.string().trim().optional(),
  validTo: z.string().trim().optional(),
});
