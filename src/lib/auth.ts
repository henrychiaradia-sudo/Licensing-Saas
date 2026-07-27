import "server-only";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { appUser, userRole, role, rolePermission, permission } from "@/lib/db/schema";
import { createSession, destroySession, getSession, type SessionData } from "./session";

export async function authenticate(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const rows = await db
    .select()
    .from(appUser)
    .where(and(eq(appUser.email, email), eq(appUser.status, "ativo")))
    .limit(1);
  const user = rows[0];
  if (!user || !user.passwordHash) return { ok: false, error: "Credenciais inválidas." };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { ok: false, error: "Credenciais inválidas." };

  const perms = await db
    .select({ code: permission.code })
    .from(userRole)
    .innerJoin(role, eq(role.id, userRole.roleId))
    .innerJoin(rolePermission, eq(rolePermission.roleId, role.id))
    .innerJoin(permission, eq(permission.id, rolePermission.permissionId))
    .where(eq(userRole.userId, user.id));
  const permissions = [...new Set(perms.map((p) => p.code))];

  await db.update(appUser).set({ lastLoginAt: new Date() }).where(eq(appUser.id, user.id));
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

export function can(session: SessionData, permission: string) {
  return session.permissions.includes(permission);
}

export { getSession };
