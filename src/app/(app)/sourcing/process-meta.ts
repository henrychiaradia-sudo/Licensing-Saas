import type { SourcingProcessType } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

/** Rótulos e tons dos tipos de processo (RFI / RFP / RFQ). */
export const PROCESS_LABEL: Record<SourcingProcessType, string> = {
  rfi: "RFI",
  rfp: "RFP",
  rfq: "RFQ",
};

export const PROCESS_TONE: Record<SourcingProcessType, Tone> = {
  rfi: "info",
  rfp: "warn",
  rfq: "neutral",
};

export const PROCESS_FULL: Record<SourcingProcessType, string> = {
  rfi: "Request for Information — qualificação e análise técnica",
  rfp: "Request for Proposal — projeto, escopo e entrega",
  rfq: "Request for Quotation — cotação de preços",
};
