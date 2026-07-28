import { z } from "zod";

export const CAMPAIGN_TYPE = [
  "lancamento",
  "sazonal",
  "promocional",
  "institucional",
  "cobranding",
] as const;
export const CAMPAIGN_STATUS = [
  "planejamento",
  "ativa",
  "pausada",
  "concluida",
  "cancelada",
] as const;
export const ACTIVATION_TYPE = ["pdv", "digital", "evento", "influencer", "outro"] as const;

export const campaignSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da campanha.").max(200),
  brandId: z.string().uuid().nullable(),
  licenseeId: z.string().uuid().nullable(),
  campaignType: z.enum(CAMPAIGN_TYPE),
  status: z.enum(CAMPAIGN_STATUS),
  budget: z.number().min(0).max(10_000_000_000),
  channel: z.string().trim().max(160).nullable(),
  goal: z.string().trim().max(500).nullable(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  notes: z.string().trim().max(2000).nullable(),
});

export const activationSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da ativação.").max(200),
  activationType: z.enum(ACTIVATION_TYPE),
  location: z.string().trim().max(160).nullable(),
  cost: z.number().min(0).max(10_000_000_000),
  scheduledAt: z.string().nullable(),
  notes: z.string().trim().max(1000).nullable(),
});
