/**
 * Canais de atendimento exibidos na capa de entrada e no login.
 * ⚠️ Valores de DEMONSTRAÇÃO — troque pelos canais reais da NovaSport/Aurora.
 */
export const SUPPORT = {
  whatsappNumber: "5511900000000", // só dígitos, com DDI (55) — placeholder
  whatsappDisplay: "+55 (11) 90000-0000",
  whatsappMessage: "Olá! Preciso de ajuda com a Aurora Licensing.",
  email: "suporte@auroralicensing.com.br",
  phone: "0800 123 4567",
  hours: "Seg. a Sex., 9h às 18h",
};

/** Monta o link do WhatsApp com mensagem pré-preenchida. */
export function whatsappLink(message: string = SUPPORT.whatsappMessage): string {
  return `https://wa.me/${SUPPORT.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
