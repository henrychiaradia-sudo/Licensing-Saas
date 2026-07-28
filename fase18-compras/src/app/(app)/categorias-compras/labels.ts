import type { SpendNature, PurchaseCategoryStatus } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

export const natureLabel: Record<SpendNature, string> = {
  capex: "Capex",
  opex: "Opex",
  mro: "MRO",
};
export const natureTone: Record<SpendNature, Tone> = {
  capex: "info",
  opex: "neutral",
  mro: "warn",
};
export const natureHint: Record<SpendNature, string> = {
  capex: "Investimento (bens de capital)",
  opex: "Despesa operacional",
  mro: "Manutenção, reparo e operação",
};

export const statusLabel: Record<PurchaseCategoryStatus, string> = {
  ativa: "Ativa",
  inativa: "Inativa",
};

export const NATURE_OPTIONS = (Object.keys(natureLabel) as SpendNature[]).map((v) => ({
  value: v,
  label: natureLabel[v],
}));
export const STATUS_OPTIONS = (Object.keys(statusLabel) as PurchaseCategoryStatus[]).map((v) => ({
  value: v,
  label: statusLabel[v],
}));
