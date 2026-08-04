import "server-only";

/**
 * Adaptador de e-mail (provedor: Resend, via API REST — sem dependência extra).
 *
 * - Com `RESEND_API_KEY` configurada, envia de verdade (texto + HTML opcional).
 * - Sem chave (ambiente de demonstração), NÃO envia e retorna `sent:false` —
 *   sem quebrar o fluxo de notificações. Assim o disparo real é ativado apenas
 *   adicionando a variável de ambiente, sem mudança de código.
 *
 * Ativação: defina na Vercel `RESEND_API_KEY` e `EMAIL_FROM` (remetente de um
 * domínio verificado no Resend, ex.: "ALIANZA <notificacoes@seudominio.com>").
 */
export type EmailInput = {
  to: string;
  subject: string;
  body: string; // texto puro (fallback)
  html?: string; // versão HTML (opcional, preferida pelos clientes de e-mail)
};

export type EmailResult = { sent: boolean; provider: string; reason?: string };

export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Sem provedor configurado: não envia. Log só em desenvolvimento e sem
    // expor o destinatário (minimização de dados pessoais — LGPD).
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email:stub] envio simulado · ${input.subject}`);
    }
    return { sent: false, provider: "stub", reason: "no-provider" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "ALIANZA <no-reply@alianza.com>",
        to: input.to,
        subject: input.subject,
        text: input.body,
        ...(input.html ? { html: input.html } : {}),
      }),
    });
    if (!res.ok) {
      // Falha do provedor: registra o status (sem PII) para diagnóstico de ops.
      console.warn(`[email] falha de envio via Resend · http_${res.status}`);
      return { sent: false, provider: "resend", reason: `http_${res.status}` };
    }
    return { sent: true, provider: "resend" };
  } catch (e) {
    console.warn(`[email] erro de conexão com o Resend`);
    return { sent: false, provider: "resend", reason: e instanceof Error ? e.message : "error" };
  }
}
