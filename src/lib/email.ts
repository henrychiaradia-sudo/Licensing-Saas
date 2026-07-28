import "server-only";

/**
 * Adaptador de e-mail. Em produção real, plugaria um provedor (Resend, SES, SMTP)
 * via variável de ambiente. Sem chave configurada (ambiente de demonstração), o
 * envio é registrado e retornado como não enviado — sem quebrar o fluxo. Isso
 * representa a camada de disparo de notificações (seção 48) de forma honesta.
 */
export type EmailInput = {
  to: string;
  subject: string;
  body: string;
};

export type EmailResult = { sent: boolean; provider: string; reason?: string };

export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Sem provedor configurado: não envia, apenas registra a intenção.
    console.log(`[email:stub] Para <${input.to}> · ${input.subject}`);
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
        from: process.env.EMAIL_FROM ?? "Aurora Licensing <no-reply@aurora.example>",
        to: input.to,
        subject: input.subject,
        text: input.body,
      }),
    });
    return { sent: res.ok, provider: "resend", reason: res.ok ? undefined : `http_${res.status}` };
  } catch (e) {
    return { sent: false, provider: "resend", reason: e instanceof Error ? e.message : "error" };
  }
}
