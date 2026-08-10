import "server-only";
import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  tenant,
  role,
  rolePermission,
  permission,
  appUser,
  userRole,
  segment,
  signupVerification,
} from "@/lib/db/schema";

export type ProvisionInput = {
  companyName: string;
  adminName: string;
  email: string;
  /** Senha JÁ com hash (bcrypt). O hash é feito na server action, não aqui. */
  passwordHash: string;
};
export type ProvisionResult = { tenantId: string; userId: string; permissions: string[] };

/** Erros tipados do fluxo de confirmação, para a UI reagir com mensagens claras. */
export type SignupErrorCode = "invalid" | "expired" | "consumed" | "email_taken";
export class SignupError extends Error {
  constructor(public code: SignupErrorCode) {
    super(code);
    this.name = "SignupError";
  }
}

function baseTenantCode(name: string): string {
  const s = name
    .normalize("NFD")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 12);
  return s || "EMPRESA";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tx = any;

/**
 * Núcleo do provisionamento, dentro de uma transação já aberta: cria a empresa,
 * o papel "Administrador" com TODAS as permissões, o usuário admin (hash pronto)
 * e o vínculo usuário↔papel, mais um segmento padrão.
 */
async function provisionTenantTx(tx: Tx, input: ProvisionInput): Promise<ProvisionResult> {
  const base = baseTenantCode(input.companyName);

  // código único da empresa
  let code = base;
  for (let i = 0; i < 6; i++) {
    const clash = await tx.select({ id: tenant.id }).from(tenant).where(eq(tenant.code, code)).limit(1);
    if (clash.length === 0) break;
    code = `${base}${Math.floor(1000 + Math.random() * 9000)}`;
  }

  const [t] = await tx
    .insert(tenant)
    .values({ code, name: input.companyName, legalName: input.companyName })
    .returning({ id: tenant.id });
  const tenantId = t.id;

  // papel Administrador com todas as permissões globais
  const [r] = await tx
    .insert(role)
    .values({ tenantId, code: "ADMIN", name: "Administrador", description: "Acesso total (criado no cadastro)" })
    .returning({ id: role.id });

  const perms = await tx.select({ id: permission.id, code: permission.code }).from(permission);
  if (perms.length > 0) {
    await tx
      .insert(rolePermission)
      .values(perms.map((p: { id: string }) => ({ roleId: r.id, permissionId: p.id })))
      .onConflictDoNothing();
  }

  // usuário administrador (interno)
  const [u] = await tx
    .insert(appUser)
    .values({
      tenantId,
      name: input.adminName,
      email: input.email,
      passwordHash: input.passwordHash,
      isInternal: true,
      status: "ativo",
    })
    .returning({ id: appUser.id });

  await tx.insert(userRole).values({ userId: u.id, roleId: r.id }).onConflictDoNothing();

  // segmento padrão para a empresa não abrir com todas as telas vazias
  await tx.insert(segment).values({ tenantId, name: "Geral" }).onConflictDoNothing();

  return { tenantId, userId: u.id, permissions: perms.map((p: { code: string }) => p.code) };
}

/**
 * Provisiona uma nova empresa (tenant) do zero, em transação única.
 *
 * OBS (RLS): quando a RLS estiver LIGADA na aplicação, este fluxo (que cria um tenant
 * NOVO, ainda sem contexto) e a tabela `signup_verification` precisarão de um caminho
 * SECURITY DEFINER, assim como o login e a verificação pública. Hoje (interruptor
 * desligado) funciona direto.
 */
export async function provisionTenant(input: ProvisionInput): Promise<ProvisionResult> {
  return db.transaction((tx) => provisionTenantTx(tx, input));
}

/** true se o e-mail ainda não está cadastrado em nenhuma empresa. */
export async function emailIsAvailable(email: string): Promise<boolean> {
  const rows = await db.select({ id: appUser.id }).from(appUser).where(eq(appUser.email, email)).limit(1);
  return rows.length === 0;
}

/* ------------------------------------------------------------------ *
 * Verificação de e-mail (dupla confirmação)                          *
 * ------------------------------------------------------------------ */

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export type PendingSignup = {
  email: string;
  companyName: string;
  adminName: string;
};

/**
 * Cria (ou renova) uma pendência de cadastro para o e-mail e devolve o token que
 * vai no link de confirmação. Remove pendências antigas do mesmo e-mail para que
 * apenas o último link seja válido.
 */
export async function createSignupVerification(input: ProvisionInput): Promise<{ token: string }> {
  await db.delete(signupVerification).where(eq(signupVerification.email, input.email));
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
  await db.insert(signupVerification).values({
    email: input.email,
    companyName: input.companyName,
    adminName: input.adminName,
    passwordHash: input.passwordHash,
    token,
    expiresAt,
  });
  return { token };
}

/**
 * Espia (somente leitura) uma pendência pelo token, para a página de confirmação
 * decidir o que mostrar. NÃO consome — a consumação só acontece no clique do botão.
 * Retorna null se o token não existir, já tiver sido usado ou estiver expirado.
 */
export async function getPendingByToken(token: string): Promise<PendingSignup | null> {
  if (!token) return null;
  const [row] = await db
    .select()
    .from(signupVerification)
    .where(eq(signupVerification.token, token))
    .limit(1);
  if (!row) return null;
  if (row.consumedAt) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;
  return { email: row.email, companyName: row.companyName, adminName: row.adminName };
}

/**
 * Confirma o e-mail: valida o token, marca como consumido e provisiona a empresa —
 * tudo na mesma transação. Lança SignupError em caso de token inválido/expirado/já
 * usado ou e-mail que passou a existir nesse meio-tempo.
 */
export async function confirmSignup(
  token: string,
): Promise<ProvisionResult & { adminName: string; email: string; companyName: string }> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(signupVerification)
      .where(eq(signupVerification.token, token))
      .limit(1)
      .for("update");

    if (!row) throw new SignupError("invalid");
    if (row.consumedAt) throw new SignupError("consumed");
    if (row.expiresAt.getTime() < Date.now()) throw new SignupError("expired");

    const taken = await tx
      .select({ id: appUser.id })
      .from(appUser)
      .where(eq(appUser.email, row.email))
      .limit(1);
    if (taken.length > 0) throw new SignupError("email_taken");

    await tx
      .update(signupVerification)
      .set({ consumedAt: new Date() })
      .where(eq(signupVerification.id, row.id));

    const result = await provisionTenantTx(tx, {
      companyName: row.companyName,
      adminName: row.adminName,
      email: row.email,
      passwordHash: row.passwordHash,
    });

    return { ...result, adminName: row.adminName, email: row.email, companyName: row.companyName };
  });
}
