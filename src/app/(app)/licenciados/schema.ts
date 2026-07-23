import { z } from "zod";

export const licenseeSchema = z.object({
  legalName: z.string().trim().min(2, "Informe a razão social."),
  tradeName: z.string().trim().optional(),
  taxId: z.string().trim().optional(),
  countryId: z.string().trim().optional(),
  segmentId: z.string().trim().optional(),
  state: z.string().trim().optional(),
  city: z.string().trim().optional(),
  website: z.string().trim().optional(),
  status: z.enum(["em_negociacao", "ativo", "inativo", "suspenso", "encerrado"]),
  riskRating: z.string().trim().optional(),
  financialScore: z.string().trim().optional(),
});

export type LicenseeFormValues = z.infer<typeof licenseeSchema>;
