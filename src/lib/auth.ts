import "server-only";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { appUser, userRole, role, rolePermission, permission } from "@/lib/db/schema";
import { createSession, destroySession, getSession, type SessionData } from "./session";
import { logAudit } from "@/lib/data/audit";
import { MAX_LOGIN_ATTEMPTS, lockMinutesFor, verifyTotp } from "@/lib/security";

export type AuthResult =
  | { ok: true }
  | { ok: false; error: string; remaining?: number; mfaRequired?: boolean };

export async function authenticate(
  email: string,
  password: string,
  code?: string,
): Promise<AuthResult> {
  const rows = await db
    .select()
    .from(appUser)
    .where(and(eq(appUser.email, email), eq(appUser.status, "ativo")))
    .limit(1);
  const user = rows[0];
  if (!user || !user.passwordHash) return { ok: false, error: "Credenciais inválidas." };

  // Conta bloqueada?
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const mins = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000));
    return { ok: false, error: `Conta bloqueada por segurança. Tente novamente em ${mins} min.` };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const attempts = (user.failedLoginAttempts ?? 0) + 1;
    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      const lockMin = lockMinutesFor(email);
      await db
        .update(appUser)
        .set({ failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + lockMin * 60000) })
        .where(eq(appUser.id, user.id));
      await logAudit(
        user.tenantId,
        user.id,
        "security.lockout",
        "security",
        user.id,
        `Conta bloqueada por ${lockMin} min após ${MAX_LOGIN_ATTEMPTS} tentativas`,
        { actorName: user.name },
      );
      return { ok: false, error: `Muitas tentativas. Conta bloqueada por ${lockMin} min.` };
    }
    await db.update(appUser).set({ failedLoginAttempts: attempts }).where(eq(appUser.id, user.id));
    const remaining = MAX_LOGIN_ATTEMPTS - attempts;
    return {
      ok: false,
      error: `Credenciais inválidas. ${remaining} tentativa(s) restante(s) antes do bloqueio.`,
      remaining,
    };
  }

  // Senha correta — exige 2FA se ativado.
  if (user.mfaEnabled && user.mfaSecret) {
    if (!code) {
      return { ok: false, error: "Informe o código do seu aplicativo autenticador.", mfaRequired: true };
    }
    if (!verifyTotp(user.mfaSecret, code)) {
      return { ok: false, error: "Código de 2FA inválido.", mfaRequired: true };
    }
  }

  const perms = await db
    .select({ code: permission.code })
    .from(userRole)
    .innerJoin(role, eq(role.id, userRole.roleId))
    .innerJoin(rolePermission, eq(rolePermission.roleId, role.id))
    .innerJoin(permission, eq(permission.id, rolePermission.permissionId))
    .where(eq(userRole.userId, user.id));
  const permissions = [...new Set(perms.map((p) => p.code))];

  await db
    .update(appUser)
    .set({ lastLoginAt: new Date(), failedLoginAttempts: 0, lockedUntil: null })
    .where(eq(appUser.id, user.id));
  await logAudit(
    user.tenantId,
    user.id,
    "security.login",
    "security",
    user.id,
    `Acesso realizado${user.mfaEnabled ? " (com 2FA)" : ""}`,
    { actorName: user.name },
  );
  await createSession({
    userId: user.id,
    tenantId: user.tenantId,
    name: user.name,
    email: user.email,
    permissions,
    licenseeId: user.licenseeId ?? null,
    supplierId: user.supplierId ?? null,
    isInternal: user.isInternal,
  });
  return { ok: true };
}

export async function logout() {
  await destroySession();
}

/** Garante uma sessão; redireciona para /login se não houver. */
export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Portal do licenciado: exige um usuário vinculado a um licenciado; senão redireciona. */
export async function requireLicenseeSession(): Promise<SessionData & { licenseeId: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.licenseeId) redirect("/dashboard");
  return session as SessionData & { licenseeId: string };
}

/** Portal do fornecedor: exige um usuário vinculado a um fornecedor; senão redireciona. */
export async function requireSupplierSession(): Promise<SessionData & { supplierId: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.supplierId) redirect("/dashboard");
  return session as SessionData & { supplierId: string };
}

/**
 * Exige um usuário INTERNO (colaborador). Bloqueia usuários de portal
 * (licenciado/fornecedor) — camada de defesa nas server actions internas,
 * além do redirecionamento já feito no layout de (app).
 */
export async function requireInternal(): Promise<SessionData> {
  const session = await requireSession();
  if (!session.isInternal) {
    if (session.licenseeId) redirect("/portal");
    if (session.supplierId) redirect("/fornecedor");
    redirect("/login");
  }
  return session;
}

export function can(session: SessionData, permission: string) {
  return session.permissions.includes(permission);
}

export { getSession };
