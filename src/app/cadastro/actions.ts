"use server";

import bcrypt from "bcryptjs";
import { validatePassword } from "@/lib/security";
import { sendEmail } from "@/lib/email";
import { createSignupVerification, emailIsAvailable } from "@/lib/data/onboarding";

export type SignUpState = { error?: string; ok?: boolean; email?: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const APP_URL = (process.env.APP_URL ?? "https://licensing-saas.vercel.app").replace(/\/$/, "");

/** Monta o e-mail de confirmação (texto + HTML com a marca ALIANZA). */
function verificationEmail(companyName: string, link: string) {
  const subject = "Confirme seu e-mail para ativar sua conta — ALIANZA";
  const body =
    `Olá!\n\n` +
    `Recebemos um pedido para criar a conta da empresa "${companyName}" na ALIANZA.\n` +
    `Para ativar a conta e entrar, confirme seu e-mail neste link (válido por 24 horas):\n\n` +
    `${link}\n\n` +
    `Se não foi você, pode ignorar esta mensagem — nenhuma conta é criada sem esta confirmação.\n\n` +
    `— Equipe ALIANZA`;
  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f5;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
      <tr><td style="padding:28px 32px 8px;">
        <div style="display:inline-block;width:34px;height:34px;background:#2563eb;border-radius:9px;color:#fff;font-weight:bold;font-size:18px;text-align:center;line-height:34px;">A</div>
        <span style="font-size:18px;font-weight:bold;letter-spacing:1px;margin-left:8px;vertical-align:middle;">ALIANZA</span>
      </td></tr>
      <tr><td style="padding:8px 32px 0;">
        <h1 style="font-size:20px;margin:12px 0 4px;">Confirme seu e-mail</h1>
        <p style="font-size:14px;line-height:1.6;color:#4b5563;margin:0 0 4px;">
          Recebemos um pedido para criar a conta da empresa <strong>${companyName}</strong> na ALIANZA.
          Clique no botão abaixo para ativar sua conta e entrar.
        </p>
      </td></tr>
      <tr><td style="padding:20px 32px 8px;">
        <a href="${link}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:11px 22px;border-radius:10px;">Confirmar meu e-mail</a>
      </td></tr>
      <tr><td style="padding:8px 32px 28px;">
        <p style="font-size:12px;line-height:1.6;color:#9ca3af;margin:12px 0 0;">
          O link expira em 24 horas. Se não foi você, ignore este e-mail — nenhuma conta é criada sem esta confirmação.
        </p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  return { subject, body, html };
}

export async function signUpAction(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const adminName = String(formData.get("adminName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!companyName || !adminName || !email || !password) {
    return { error: "Preencha todos os campos." };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "Informe um e-mail válido." };
  }
  const pol = validatePassword(password);
  if (!pol.ok) return { error: pol.error };

  if (!(await emailIsAvailable(email))) {
    return { error: "Este e-mail já está cadastrado. Tente fazer login." };
  }

  // Guarda a pendência com a senha já em hash (nada de texto puro no banco).
  const passwordHash = await bcrypt.hash(password, 10);
  const { token } = await createSignupVerification({ companyName, adminName, email, passwordHash });

  const link = `${APP_URL}/cadastro/confirmar?token=${token}`;
  const { subject, body, html } = verificationEmail(companyName, link);
  const result = await sendEmail({ to: email, subject, body, html });

  if (!result.sent) {
    return {
      error:
        "Não conseguimos enviar o e-mail de confirmação agora. Verifique o endereço e tente novamente em instantes.",
    };
  }

  return { ok: true, email };
}
