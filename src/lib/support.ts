/**
 * Canais de atendimento exibidos na capa de entrada e no login.
 * ⚠️ Valores de DEMONSTRAÇÃO — troque pelos canais reais da ALIANZA.
 */
export const SUPPORT = {
  whatsappNumber: "5511900000000", // só dígitos, com DDI (55) — placeholder
  whatsappDisplay: "+55 (11) 90000-0000",
  whatsappMessage: "Olá! Preciso de ajuda com a ALIANZA.",
  email: "suporte@alianza.com",
  phone: "0800 123 4567",
  hours: "Seg. a Sex., 9h às 18h",
};

/** Monta o link do WhatsApp com mensagem pré-preenchida. */
export function whatsappLink(message: string = SUPPORT.whatsappMessage): string {
  return `https://wa.me/${SUPPORT.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Encarregado pelo Tratamento de Dados Pessoais (DPO) — LGPD, art. 41.
 * ⚠️ Valores de DEMONSTRAÇÃO — troque pelos dados reais do encarregado da ALIANZA.
 */
export const DPO = {
  name: "Encarregado de Proteção de Dados (DPO)",
  email: "dpo@alianza.com",
};

/** Última atualização dos documentos legais (exibida nas páginas). */
export const LEGAL_UPDATED = "julho de 2026";
