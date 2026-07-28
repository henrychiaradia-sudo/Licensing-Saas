import "server-only";
import { and, eq, asc, sql, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { role, permission, rolePermission, userRole, appUser } from "@/lib/db/schema";

export async function listRoles(tenantId: string) {
  const rows = await db
    .select({
      id: role.id,
      code: role.code,
      name: role.name,
      description: role.description,
      permCount: sql<number>`(select count(*) from role_permission rp where rp.role_id = ${role.id})::int`,
      userCount: sql<number>`(select count(*) from user_role ur where ur.role_id = ${role.id})::int`,
    })
    .from(role)
    .where(eq(role.tenantId, tenantId))
    .orderBy(asc(role.name));
  return rows;
}

export async function accessSummary(tenantId: string) {
  const r = await db
    .select({
      roles: sql<string>`count(distinct ${role.id})`,
    })
    .from(role)
    .where(eq(role.tenantId, tenantId));
  const perms = await db.select({ c: sql<string>`count(*)` }).from(permission);
  const users = await db
    .select({ c: sql<string>`count(*)` })
    .from(appUser)
    .where(and(eq(appUser.tenantId, tenantId), eq(appUser.isInternal, true)));
  return {
    roles: Number(r[0]?.roles ?? 0),
    permissions: Number(perms[0]?.c ?? 0),
    internalUsers: Number(users[0]?.c ?? 0),
  };
}

export async function listPermissions() {
  return db
    .select({ id: permission.id, code: permission.code, description: permission.description })
    .from(permission)
    .orderBy(asc(permission.code));
}

export async function getRoleDetail(tenantId: string, roleId: string) {
  const rows = await db
    .select()
    .from(role)
    .where(and(eq(role.id, roleId), eq(role.tenantId, tenantId)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;

  const perms = await db
    .select({ permissionId: rolePermission.permissionId })
    .from(rolePermission)
    .where(eq(rolePermission.roleId, roleId));
  const permissionIds = new Set(perms.map((p) => p.permissionId));

  const members = await db
    .select({ userId: appUser.id, name: appUser.name, email: appUser.email })
    .from(userRole)
    .innerJoin(appUser, eq(appUser.id, userRole.userId))
    .where(eq(userRole.roleId, roleId))
    .orderBy(asc(appUser.name));

  return { role: head, permissionIds, members };
}

export async function listInternalUsers(tenantId: string) {
  return db
    .select({ id: appUser.id, name: appUser.name, email: appUser.email })
    .from(appUser)
    .where(and(eq(appUser.tenantId, tenantId), eq(appUser.isInternal, true)))
    .orderBy(asc(appUser.name));
}

/** Confirma que o papel pertence ao tenant (segurança). */
async function roleBelongsTo(tenantId: string, roleId: string): Promise<boolean> {
  const r = await db
    .select({ id: role.id })
    .from(role)
    .where(and(eq(role.id, roleId), eq(role.tenantId, tenantId)))
    .limit(1);
  return !!r[0];
}

export async function setRolePermission(
  tenantId: string,
  roleId: string,
  permissionId: string,
  on: boolean,
): Promise<void> {
  if (!(await roleBelongsTo(tenantId, roleId))) return;
  if (on) {
    await db.insert(rolePermission).values({ roleId, permissionId }).onConflictDoNothing();
  } else {
    await db
      .delete(rolePermission)
      .where(and(eq(rolePermission.roleId, roleId), eq(rolePermission.permissionId, permissionId)));
  }
}

export async function setUserRole(
  tenantId: string,
  roleId: string,
  userId: string,
  on: boolean,
): Promise<void> {
  if (!(await roleBelongsTo(tenantId, roleId))) return;
  // Garante que o usuário é do mesmo tenant.
  const u = await db
    .select({ id: appUser.id })
    .from(appUser)
    .where(and(eq(appUser.id, userId), eq(appUser.tenantId, tenantId)))
    .limit(1);
  if (!u[0]) return;
  if (on) {
    await db.insert(userRole).values({ userId, roleId }).onConflictDoNothing();
  } else {
    await db.delete(userRole).where(and(eq(userRole.roleId, roleId), eq(userRole.userId, userId)));
  }
}
