import "server-only";
import * as OTPAuth from "otpauth";

/* ============ Configuração de bloqueio (brando & seguro) ============ */
export const MAX_LOGIN_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
export const DEMO_LOCK_MINUTES = 1;

/** Contas de demonstração: bloqueio curto para nunca travar a apresentação. */
const DEMO_EMAILS = new Set([
  "admin@novasport.com",
  "portal@vestebem.com",
  "portal@pacificmfg.com",
]);

export function lockMinutesFor(email: string): number {
  return DEMO_EMAILS.has(email.toLowerCase()) ? DEMO_LOCK_MINUTES : LOCK_MINUTES;
}

/* ============ Política de senha ============ */
export function validatePassword(pw: string): { ok: boolean; error?: string } {
  if (pw.length < 8) return { ok: false, error: "A senha deve ter ao menos 8 caracteres." };
  if (!/[a-z]/.test(pw)) return { ok: false, error: "A senha deve conter uma letra minúscula." };
  if (!/[A-Z]/.test(pw)) return { ok: false, error: "A senha deve conter uma letra maiúscula." };
  if (!/[0-9]/.test(pw)) return { ok: false, error: "A senha deve conter um número." };
  return { ok: true };
}

/** Força relativa da senha (0–4), para o medidor visual. */
export function passwordStrength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

/* ============ TOTP / 2FA (compatível com Google Authenticator, Authy…) ============ */
const ISSUER = "Aurora Licensing";

function totpFor(email: string, base32Secret: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(base32Secret),
  });
}

/** Gera um novo segredo TOTP (base32) e a URI otpauth:// para o QR. */
export function generateMfaSecret(email: string): { secret: string; uri: string } {
  const secret = new OTPAuth.Secret({ size: 20 });
  const totp = totpFor(email, secret.base32);
  return { secret: secret.base32, uri: totp.toString() };
}

/** Reconstrói a URI otpauth:// a partir de um segredo já salvo. */
export function otpauthUri(email: string, base32Secret: string): string {
  return totpFor(email, base32Secret).toString();
}

/** Valida um código TOTP (janela ±1 período para tolerar clock skew). */
export function verifyTotp(base32Secret: string, code: string): boolean {
  const clean = (code || "").replace(/\s+/g, "");
  if (!/^[0-9]{6}$/.test(clean)) return false;
  try {
    const delta = totpFor("", base32Secret).validate({ token: clean, window: 1 });
    return delta !== null;
  } catch {
    return false;
  }
}
