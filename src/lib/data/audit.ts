import "server-only";
import { eq, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLog, appUser } from "@/lib/db/schema";

export async function listAuditLog(tenantId: string) {
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      occurredAt: auditLog.occurredAt,
      userName: appUser.name,
    })
    .from(auditLog)
    .leftJoin(appUser, eq(appUser.id, auditLog.userId))
    .where(eq(auditLog.tenantId, tenantId))
    .orderBy(desc(auditLog.occurredAt))
    .limit(100);
}
