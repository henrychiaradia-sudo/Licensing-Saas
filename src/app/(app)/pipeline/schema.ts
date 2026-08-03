import { z } from "zod";

export const OPPORTUNITY_STAGE = [
  "prospeccao",
  "qualificacao",
  "proposta",
  "negociacao",
  "ganho",
  "perdido",
] as const;

export const ACTIVITY_TYPE = ["nota", "ligacao", "reuniao", "email", "proposta"] as const;
export const FIRST_CONTACT_CHANNEL = [
  "WhatsApp",
  "E-mail",
  "Telefone",
  "Evento",
  "Indicação",
  "Inbound",
  "Outro",
] as const;

export const opportunitySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da oportunidade.").max(200),
  companyName: z.string().trim().max(200).nullable(),
  contactName: z.string().trim().max(160).nullable(),
  contactEmail: z.string().trim().max(160).nullable(),
  contactPhone: z.string().trim().max(60).nullable(),
  brandId: z.string().uuid().nullable(),
  segmentId: z.string().uuid().nullable(),
  stage: z.enum(OPPORTUNITY_STAGE),
  estimatedValue: z.number().min(0).max(10_000_000_000),
  source: z.string().trim().max(120).nullable(),
  firstContactDate: z.string().nullable(),
  firstContactChannel: z.string().trim().max(40).nullable(),
  expectedCloseDate: z.string().nullable(),
  ownerUserId: z.string().uuid().nullable(),
  notes: z.string().trim().max(2000).nullable(),
});

export const activitySchema = z.object({
  activityType: z.enum(ACTIVITY_TYPE),
  description: z.string().trim().min(2, "Descreva a interação.").max(2000),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do responsável.").max(160),
  role: z.string().trim().max(120).nullable(),
  email: z.string().trim().max(160).nullable(),
  phone: z.string().trim().max(60).nullable(),
  isPrimary: z.boolean(),
});
