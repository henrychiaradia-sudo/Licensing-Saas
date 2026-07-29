import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appUser, licensee, supplier } from "@/lib/db/schema";
import type { SessionData } from "@/lib/session";

/**
 * Reúne os dados pessoais do titular autenticado (LGPD art. 18 — acesso e
 * portabilidade). Retorna uma estrutura serializável para download/consulta.
 */
export async function getSubjectData(session: SessionData) {
  const rows = await db
    .select({
      id: appUser.id,
      nome: appUser.name,
      email: appUser.email,
      status: appUser.status,
      usuarioInterno: appUser.isInternal,
      duasEtapas: appUser.mfaEnabled,
      ultimoAcesso: appUser.lastLoginAt,
      criadoEm: appUser.createdAt,
    })
    .from(appUser)
    .where(and(eq(appUser.id, session.userId), eq(appUser.tenantId, session.tenantId)))
    .limit(1);
  const titular = rows[0] ?? null;

  let vinculo: Record<string, unknown> | null = null;
  if (session.licenseeId) {
    const l = await db
      .select({
        razaoSocial: licensee.legalName,
        nomeFantasia: licensee.tradeName,
        documento: licensee.taxId,
        cidade: licensee.city,
        estado: licensee.state,
      })
      .from(licensee)
      .where(and(eq(licensee.id, session.licenseeId), eq(licensee.tenantId, session.tenantId)))
      .limit(1);
    if (l[0]) vinculo = { tipo: "Licenciado", ...l[0] };
  } else if (session.supplierId) {
    const s = await db
      .select({
        razaoSocial: supplier.legalName,
        nomeFantasia: supplier.tradeName,
        cnpj: supplier.cnpj,
        email: supplier.email,
        telefone: supplier.phone,
        cidade: supplier.city,
      })
      .from(supplier)
      .where(and(eq(supplier.id, session.supplierId), eq(supplier.tenantId, session.tenantId)))
      .limit(1);
    if (s[0]) vinculo = { tipo: "Fornecedor", ...s[0] };
  }

  return {
    perfil: session.isInternal
      ? "Usuário interno"
      : session.licenseeId
        ? "Portal do licenciado"
        : "Portal do fornecedor",
    titular,
    vinculo,
    permissoes: session.permissions,
    geradoEm: new Date().toISOString(),
  };
}
