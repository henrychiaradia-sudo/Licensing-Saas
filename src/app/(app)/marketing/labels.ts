import type {
  CampaignStatus,
  CampaignType,
  MarketingActionType,
  MarketingActionStatus,
  MarketingPlanStatus,
  AgencyType,
} from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

/* ----------------------------- Campanhas ----------------------------- */
export const campaignStatusTone: Record<CampaignStatus, Tone> = {
  planejamento: "neutral",
  ativa: "good",
  pausada: "warn",
  concluida: "info",
  cancelada: "danger",
};
export const campaignStatusLabel: Record<CampaignStatus, string> = {
  planejamento: "Planejamento",
  ativa: "Ativa",
  pausada: "Pausada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};
export const campaignTypeLabel: Record<CampaignType, string> = {
  lancamento: "Lançamento",
  sazonal: "Sazonal",
  promocional: "Promocional",
  institucional: "Institucional",
  cobranding: "Co-branding",
};

/* ------------------------------- Ações ------------------------------- */
export const actionTypeLabel: Record<MarketingActionType, string> = {
  ativacao: "Ativação",
  evento: "Evento",
  influenciador: "Influenciador",
  patrocinio: "Patrocínio",
  conteudo: "Conteúdo",
  midia_paga: "Mídia paga",
  midia_espontanea: "Mídia espontânea",
  redes_sociais: "Redes sociais",
  promocao: "Promoção",
  producao: "Produção",
  pdv: "PDV",
  outro: "Outro",
};
export const actionStatusTone: Record<MarketingActionStatus, Tone> = {
  planejada: "neutral",
  em_andamento: "info",
  concluida: "good",
  cancelada: "danger",
};
export const actionStatusLabel: Record<MarketingActionStatus, string> = {
  planejada: "Planejada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

/* ------------------------------- Planos ------------------------------ */
export const planStatusTone: Record<MarketingPlanStatus, Tone> = {
  rascunho: "neutral",
  aprovado: "info",
  em_execucao: "good",
  concluido: "info",
  cancelado: "danger",
};
export const planStatusLabel: Record<MarketingPlanStatus, string> = {
  rascunho: "Rascunho",
  aprovado: "Aprovado",
  em_execucao: "Em execução",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

/* ------------------------------ Agências ----------------------------- */
export const agencyTypeLabel: Record<AgencyType, string> = {
  criacao: "Criação",
  midia: "Mídia",
  digital: "Digital",
  pr: "Assessoria (PR)",
  eventos: "Eventos",
  producao: "Produção",
  outro: "Outro",
};

/* ------------------------------- Options ----------------------------- */
export const CAMPAIGN_TYPE_OPTIONS = (Object.keys(campaignTypeLabel) as CampaignType[]).map((v) => ({
  value: v,
  label: campaignTypeLabel[v],
}));
export const CAMPAIGN_STATUS_OPTIONS = (Object.keys(campaignStatusLabel) as CampaignStatus[]).map(
  (v) => ({ value: v, label: campaignStatusLabel[v] }),
);
export const ACTION_TYPE_OPTIONS = (Object.keys(actionTypeLabel) as MarketingActionType[]).map(
  (v) => ({ value: v, label: actionTypeLabel[v] }),
);
export const ACTION_STATUS_OPTIONS = (Object.keys(actionStatusLabel) as MarketingActionStatus[]).map(
  (v) => ({ value: v, label: actionStatusLabel[v] }),
);
export const PLAN_STATUS_OPTIONS = (Object.keys(planStatusLabel) as MarketingPlanStatus[]).map(
  (v) => ({ value: v, label: planStatusLabel[v] }),
);
export const AGENCY_TYPE_OPTIONS = (Object.keys(agencyTypeLabel) as AgencyType[]).map((v) => ({
  value: v,
  label: agencyTypeLabel[v],
}));
