import { z } from "zod";

const nullableStr = (max: number) => z.string().trim().max(max).nullable();
const money = z.number().min(0).max(10_000_000_000);
const optMoney = z.number().min(0).max(10_000_000_000).nullable();
const optInt = z.number().int().min(0).max(9_000_000_000).nullable();

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
export const ACTION_TYPE = [
  "ativacao",
  "evento",
  "influenciador",
  "patrocinio",
  "conteudo",
  "midia_paga",
  "midia_espontanea",
  "redes_sociais",
  "promocao",
  "producao",
  "pdv",
  "outro",
] as const;
export const ACTION_STATUS = ["planejada", "em_andamento", "concluida", "cancelada"] as const;
export const PLAN_STATUS = ["rascunho", "aprovado", "em_execucao", "concluido", "cancelado"] as const;
export const AGENCY_TYPE = [
  "criacao",
  "midia",
  "digital",
  "pr",
  "eventos",
  "producao",
  "outro",
] as const;

/* ------------------------------- Campanha ------------------------------- */
export const campaignSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da campanha.").max(200),
  brandId: z.string().uuid().nullable(),
  licenseeId: z.string().uuid().nullable(),
  planId: z.string().uuid().nullable(),
  campaignType: z.enum(CAMPAIGN_TYPE),
  status: z.enum(CAMPAIGN_STATUS),
  budget: money,
  channel: nullableStr(160),
  goal: nullableStr(500),
  publico: nullableStr(300),
  territorio: nullableStr(160),
  coop: z.boolean(),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  notes: nullableStr(2000),
});

/* --------------------------------- Ação --------------------------------- */
export const actionSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da ação.").max(200),
  actionType: z.enum(ACTION_TYPE),
  status: z.enum(ACTION_STATUS),
  campaignId: z.string().uuid().nullable(),
  channel: nullableStr(160),
  territorio: nullableStr(160),
  agencyId: z.string().uuid().nullable(),
  influencerId: z.string().uuid().nullable(),
  budget: money,
  spent: money,
  revenue: money,
  reachTarget: optInt,
  reachActual: optInt,
  coop: z.boolean(),
  location: nullableStr(160),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  evidenceUrl: nullableStr(500),
  resultNotes: nullableStr(1000),
  notes: nullableStr(1000),
});

/* --------------------------------- KPI ---------------------------------- */
export const kpiSchema = z.object({
  name: z.string().trim().min(1, "Informe o KPI.").max(160),
  target: optMoney,
  realized: money,
  unit: nullableStr(40),
});

/* --------------------------------- Plano -------------------------------- */
export const planSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do plano.").max(200),
  year: z.number().int().min(2000).max(2100).nullable(),
  brandId: z.string().uuid().nullable(),
  licenseeId: z.string().uuid().nullable(),
  objetivo: nullableStr(1000),
  publico: nullableStr(300),
  territorio: nullableStr(160),
  budget: money,
  status: z.enum(PLAN_STATUS),
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  notes: nullableStr(2000),
});

/* -------------------------------- Agência ------------------------------- */
export const agencySchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da agência.").max(200),
  agencyType: z.enum(AGENCY_TYPE),
  contactName: nullableStr(160),
  email: z.union([z.string().trim().email("E-mail inválido."), z.literal("")]).nullable(),
  phone: nullableStr(60),
  notes: nullableStr(1000),
});

/* ----------------------------- Influenciador ---------------------------- */
export const influencerSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(200),
  handle: nullableStr(120),
  platform: nullableStr(80),
  followers: optInt,
  fee: optMoney,
  segment: nullableStr(120),
  notes: nullableStr(1000),
});
