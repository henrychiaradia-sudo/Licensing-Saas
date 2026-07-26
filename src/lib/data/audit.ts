import "server-only";
import { and, eq, desc } from "drizzle-orm";
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
      occurredAt: auditLog.occurredAt,
      userName: appUser.name,
    })
    .from(auditLog)
    .leftJoin(appUser, eq(appUser.id, auditLog.userId))
    .where(and(...conds))
    .orderBy(desc(auditLog.occurredAt))
    .limit(150);
}

/**
 * Registra uma ação na trilha de auditoria. Nunca lança — auditoria não deve
 * quebrar o fluxo de negócio.
 */
export async function logAudit(
  tenantId: string,
  userId: string | null,
  action: string,
  entityType: string,
  entityId?: string | null,
  summary?: string,
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      tenantId,
      userId: userId ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      changes: summary ? { summary } : null,
    });
  } catch {
    // silencioso de propósito
  }
}
