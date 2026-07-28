import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auditLog, appUser } from "@/lib/db/schema";

export async function listAuditLog(tenantId: string, opts?: { entityType?: string }) {
  const conds = [eq(auditLog.tenantId, tenantId)];
  if (opts?.entityType) conds.push(eq(auditLog.entityType, opts.entityType));
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      changes: auditLog.changes,
      actorName: auditLog.actorName,
      actorIp: auditLog.actorIp,
      occurredAt: auditLog.occurredAt,
      userName: appUser.name,
    })
    .from(auditLog)
    .leftJoin(appUser, eq(appUser.id, auditLog.userId))
    .where(and(...conds))
    .orderBy(desc(auditLog.occurredAt))
    .limit(150);
}

/** Lê o IP do cliente a partir dos cabeçalhos da requisição (proxy da Vercel). */
async function readClientIp(): Promise<string | null> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]!.trim();
    return h.get("x-real-ip");
  } catch {
    return null;
  }
}

export type AuditDetails = {
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  actorName?: string | null;
};

/**
 * Registra uma ação na trilha de auditoria. Nunca lança — auditoria não deve
 * quebrar o fluxo de negócio. Captura IP do autor automaticamente e guarda os
 * valores antes/depois quando informados (auditoria forense).
 */
export async function logAudit(
  tenantId: string,
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  summary?: string,
  details?: AuditDetails,
): Promise<void> {
  try {
    const ip = await readClientIp();
    const changes: Record<string, unknown> = {};
    if (summary) changes.summary = summary;
    if (details?.before !== undefined) changes.before = details.before;
    if (details?.after !== undefined) changes.after = details.after;
    await db.insert(auditLog).values({
      tenantId,
      userId: userId ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      changes: Object.keys(changes).length ? changes : null,
      actorName: details?.actorName ?? null,
      actorIp: ip,
    });
  } catch {
    // silencioso de propósito
  }
}
