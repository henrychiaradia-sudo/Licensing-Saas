"use server";

import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { setRolePermission, setUserRole } from "@/lib/data/access";
import { logAudit } from "@/lib/data/audit";

export async function toggleRolePermissionAction(
  roleId: string,
  permissionId: string,
  formData: FormData,
): Promise<void> {
  const session = await requireSession();
  if (!session.isInternal) return;
  if (!can(session, PERMISSIONS.accessWrite)) return;
  const on = String(formData.get("on") ?? "") === "true";
  await setRolePermission(session.tenantId, roleId, permissionId, on);
  await logAudit(
    session.tenantId,
    session.userId,
    "access.role_permission",
    "role",
    roleId,
    `${on ? "Concedeu" : "Removeu"} permissão do perfil`,
    { actorName: session.name },
  );
  revalidatePath(`/acessos/${roleId}`);
}

export async function toggleUserRoleAction(
  roleId: string,
  userId: string,
  formData: FormData,
): Promise<void> {
  const session = await requireSession();
  if (!session.isInternal) return;
  if (!can(session, PERMISSIONS.accessWrite)) return;
  const on = String(formData.get("on") ?? "") === "true";
  await setUserRole(session.tenantId, roleId, userId, on);
  await logAudit(
    session.tenantId,
    session.userId,
    "access.user_role",
    "role",
    roleId,
    `${on ? "Atribuiu" : "Removeu"} usuário do perfil`,
    { actorName: session.name },
  );
  revalidatePath(`/acessos/${roleId}`);
}
