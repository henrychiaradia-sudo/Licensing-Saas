import "server-only";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenant, role, rolePermission, permission, appUser, userRole, segment } from "@/lib/db/schema";

export type ProvisionInput = {
  companyName: string;
  adminName: string;
  email: string;
  password: string;
};
export type ProvisionResult = { tenantId: string; userId: string; permissions: string[] };

function baseTenantCode(name: string): string {
  const s = name
    .normalize("NFD")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 12);
  return s || "EMPRESA";
}

/**
 * Provisiona uma nova empresa (tenant) do zero: cria a empresa, o papel
 * "Administrador" com TODAS as permissões, o usuário admin (senha com hash) e o
 * vínculo usuário↔papel — tudo numa única transação. É a base do auto-cadastro (Fase B).
 *
 * OBS (RLS): quando a RLS estiver LIGADA na aplicação, este fluxo (que cria um tenant
 * NOVO, ainda sem contexto) precisará de um caminho SECURITY DEFINER, assim como o login
 * e a verificação pública. Hoje (interruptor desligado) funciona direto.
 */
export async function provisionTenant(input: ProvisionInput): Promise<ProvisionResult> {
  const passwordHash = await bcrypt.hash(input.password, 10);
  const base = baseTenantCode(input.companyName);

  return db.transaction(async (tx) => {
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
        .values(perms.map((p) => ({ roleId: r.id, permissionId: p.id })))
        .onConflictDoNothing();
    }

    // usuário administrador (interno)
    const [u] = await tx
      .insert(appUser)
      .values({
        tenantId,
        name: input.adminName,
        email: input.email,
        passwordHash,
        isInternal: true,
        status: "ativo",
      })
      .returning({ id: appUser.id });

    await tx.insert(userRole).values({ userId: u.id, roleId: r.id }).onConflictDoNothing();

    // segmento padrão para a empresa não abrir com todas as telas vazias
    await tx.insert(segment).values({ tenantId, name: "Geral" }).onConflictDoNothing();

    return { tenantId, userId: u.id, permissions: perms.map((p) => p.code) };
  });
}

/** true se o e-mail ainda não está cadastrado em nenhuma empresa. */
export async function emailIsAvailable(email: string): Promise<boolean> {
  const rows = await db.select({ id: appUser.id }).from(appUser).where(eq(appUser.email, email)).limit(1);
  return rows.length === 0;
}
