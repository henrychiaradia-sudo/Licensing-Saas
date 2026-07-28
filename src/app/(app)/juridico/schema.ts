import { z } from "zod";

export const LEGAL_CASE_TYPE = [
  "contencioso",
  "consultivo",
  "contratual",
  "propriedade_intelectual",
  "trabalhista",
  "tributario",
] as const;
export const LEGAL_CASE_STATUS = [
  "aberto",
  "em_andamento",
  "suspenso",
  "encerrado",
  "arquivado",
] as const;
export const LEGAL_PRIORITY = ["baixa", "media", "alta", "critica"] as const;
export const LEGAL_EVENT_TYPE = [
  "andamento",
  "audiencia",
  "peticao",
  "decisao",
  "acordo",
  "prazo",
] as const;

export const legalCaseSchema = z.object({
  title: z.string().trim().min(3, "Informe o título do caso.").max(200),
  caseType: z.enum(LEGAL_CASE_TYPE),
  status: z.enum(LEGAL_CASE_STATUS),
  priority: z.enum(LEGAL_PRIORITY),
  counterparty: z.string().trim().max(200).nullable(),
  licenseeId: z.string().uuid().nullable(),
  brandId: z.string().uuid().nullable(),
  amountAtRisk: z.number().min(0).max(1_000_000_000_000),
  responsible: z.string().trim().max(160).nullable(),
  forum: z.string().trim().max(200).nullable(),
  openedAt: z.string().nullable(),
  dueDate: z.string().nullable(),
  description: z.string().trim().max(2000).nullable(),
  notes: z.string().trim().max(2000).nullable(),
});

export const legalEventSchema = z.object({
  eventType: z.enum(LEGAL_EVENT_TYPE),
  description: z.string().trim().min(2, "Descreva o andamento.").max(1000),
  occurredAt: z.string().nullable(),
});
