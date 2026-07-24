import { z } from "zod";

export const CONTRACT_STATUS = [
  "rascunho",
  "em_aprovacao",
  "vigente",
  "suspenso",
  "renovado",
  "expirado",
  "encerrado",
] as const;

export const EXCLUSIVITY = ["exclusivo", "nao_exclusivo"] as const;

export const contractSchema = z.object({
  contractNumber: z.string().trim().min(2, "Informe o número do contrato.").max(80),
  licenseeId: z.string().uuid("Selecione um licenciado."),
  currencyId: z.string().uuid("Selecione a moeda."),
  status: z.enum(CONTRACT_STATUS),
  exclusivity: z.enum(EXCLUSIVITY),
  signingDate: z.string().nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  autoRenewal: z.boolean(),
  renewalTermMonths: z.number().int().min(0).max(600).nullable(),
  minimumGuaranteeTotal: z.number().min(0).nullable(),
  insuranceRequired: z.boolean(),
  insuranceInfo: z.string().trim().max(500).nullable(),
  notes: z.string().trim().max(2000).nullable(),
  brandIds: z.array(z.string().uuid()),
});

export type ContractFormData = z.infer<typeof contractSchema>;
