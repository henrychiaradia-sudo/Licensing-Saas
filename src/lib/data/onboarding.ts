import "server-only";
import { randomBytes } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * Auto-cadastro (Fase B) — fluxo PRÉ-TENANT (roda sem contexto de empresa).
 *
 * Todo o acesso ao banco passa por funções SECURITY DEFINER no Postgres
 * (signup_email_available / signup_upsert_verification / signup_get_pending /
 * signup_confirm), exatamente como o login (auth_user_by_email) e a verificação
 * pública (verify_document_by_code). Assim o fluxo funciona também sob RLS
 * (papel app_runtime, sem bypass), pois as funções são donas do postgres e
 * ignoram a RLS com segurança. Com a RLS desligada, funciona igual.
 */

export type ProvisionInput = {
  companyName: string;
  adminName: string;
  email: string;
  /** Senha JÁ com hash (bcrypt). O hash é feito na server action. */
  passwordHash: string;
};

export type PendingSignup = { email: string; companyName: string; adminName: string };

export type ConfirmResult = {
  tenantId: string;
  userId: string;
  permissions: string[];
  adminName: string;
  email: string;
};

/** Erros tipados do fluxo de confirmação, para a UI reagir com mensagens claras. */
export type SignupErrorCode = "invalid" | "expired" | "consumed" | "email_taken";
export class SignupError extends Error {
  constructor(public code: SignupErrorCode) {
    super(code);
    this.name = "SignupError";
  }
}

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

/** true se o e-mail ainda não está cadastrado em nenhuma empresa. */
export async function emailIsAvailable(email: string): Promise<boolean> {
  const rows = (await db.execute(
    sql`select public.signup_email_available(${email}) as available`,
  )) as unknown as Array<{ available: boolean }>;
  return rows[0]?.available === true;
}

/**
 * Cria (ou renova) uma pendência de cadastro para o e-mail e devolve o token que
 * vai no link de confirmação. A função no banco remove pendências antigas do
 * mesmo e-mail, de modo que apenas o último link seja válido.
 */
export async function createSignupVerification(input: ProvisionInput): Promise<{ token: string }> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await db.execute(
    sql`select public.signup_upsert_verification(${input.email}, ${input.companyName}, ${input.adminName}, ${input.passwordHash}, ${token}, ${expiresAt})`,
  );
  return { token };
}

/**
 * Espia (somente leitura) uma pendência válida pelo token, para a página de
 * confirmação decidir o que mostrar. NÃO consome. Retorna null se o token não
 * existir, já tiver sido usado ou estiver expirado.
 */
export async function getPendingByToken(token: string): Promise<PendingSignup | null> {
  if (!token) return null;
  const rows = (await db.execute(
    sql`select * from public.signup_get_pending(${token})`,
  )) as unknown as Array<{ email: string; company_name: string; admin_name: string }>;
  const r = rows[0];
  if (!r) return null;
  return { email: r.email, companyName: r.company_name, adminName: r.admin_name };
}

/**
 * Confirma o e-mail: a função no banco valida o token, marca como consumido e
 * provisiona a empresa (tenant + papel Administrador com as 48 permissões +
 * usuário + segmento) — tudo atômico. Lança SignupError em caso de token
 * inválido/expirado/já usado ou e-mail que passou a existir nesse meio-tempo.
 */
export async function confirmSignup(token: string): Promise<ConfirmResult> {
  try {
    const rows = (await db.execute(
      sql`select * from public.signup_confirm(${token})`,
    )) as unknown as Array<{
      tenant_id: string;
      user_id: string;
      admin_name: string;
      email: string;
      permissions: string[] | null;
    }>;
    const r = rows[0];
    if (!r) throw new SignupError("invalid");
    return {
      tenantId: r.tenant_id,
      userId: r.user_id,
      permissions: r.permissions ?? [],
      adminName: r.admin_name,
      email: r.email,
    };
  } catch (e) {
    if (e instanceof SignupError) throw e;
    const msg = (e as { message?: string })?.message ?? "";
    const known: SignupErrorCode[] = ["email_taken", "invalid", "expired", "consumed"];
    const hit = known.find((k) => msg.includes(k));
    if (hit) throw new SignupError(hit);
    throw e;
  }
}
