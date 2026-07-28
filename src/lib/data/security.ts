import "server-only";
import bcrypt from "bcryptjs";
import { and, eq, desc, like } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { appUser, auditLog } from "@/lib/db/schema";
import { logAudit } from "@/lib/data/audit";
import { generateMfaSecret, verifyTotp, validatePassword } from "@/lib/security";

export async function getSecurityOverview(userId: string) {
  const rows = await db
    .select({
      email: appUser.email,
      name: appUser.name,
      mfaEnabled: appUser.mfaEnabled,
      lastLoginAt: appUser.lastLoginAt,
      passwordUpdatedAt: appUser.passwordUpdatedAt,
    })
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function listSecurityEvents(tenantId: string, userId: string) {
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      changes: auditLog.changes,
      actorIp: auditLog.actorIp,
      occurredAt: auditLog.occurredAt,
    })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.tenantId, tenantId),
        eq(auditLog.userId, userId),
        like(auditLog.action, "security.%"),
      ),
    )
    .orderBy(desc(auditLog.occurredAt))
    .limit(30);
}

/** Gera e persiste um segredo TOTP (ainda desativado) e devolve o QR para configuração. */
export async function beginMfaSetup(
  userId: string,
  email: string,
): Promise<{ uri: string; secret: string; qrDataUrl: string }> {
  const { secret, uri } = generateMfaSecret(email);
  await db
    .update(appUser)
    .set({ mfaSecret: secret, mfaEnabled: false, updatedAt: new Date() })
    .where(eq(appUser.id, userId));
  const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
  return { uri, secret, qrDataUrl };
}

/** Confirma o código do autenticador e ativa o 2FA. */
export async function confirmMfa(
  tenantId: string,
  userId: string,
  code: string,
  actorName: string,
): Promise<{ ok: boolean; error?: string }> {
  const rows = await db
    .select({ secret: appUser.mfaSecret })
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);
  const secret = rows[0]?.secret;
  if (!secret) return { ok: false, error: "Inicie a configuração do 2FA primeiro." };
  if (!verifyTotp(secret, code)) return { ok: false, error: "Código inválido. Tente novamente." };
  await db.update(appUser).set({ mfaEnabled: true, updatedAt: new Date() }).where(eq(appUser.id, userId));
  await logAudit(tenantId, userId, "security.mfa_enabled", "security", userId, "2FA ativado", { actorName });
  return { ok: true };
}

export async function disableMfa(
  tenantId: string,
  userId: string,
  actorName: string,
): Promise<void> {
  await db
    .update(appUser)
    .set({ mfaEnabled: false, mfaSecret: null, updatedAt: new Date() })
    .where(eq(appUser.id, userId));
  await logAudit(tenantId, userId, "security.mfa_disabled", "security", userId, "2FA desativado", { actorName });
}

export async function changePassword(
  tenantId: string,
  userId: string,
  currentPw: string,
  newPw: string,
  actorName: string,
): Promise<{ ok: boolean; error?: string }> {
  const rows = await db
    .select({ hash: appUser.passwordHash })
    .from(appUser)
    .where(eq(appUser.id, userId))
    .limit(1);
  const hash = rows[0]?.hash;
  if (!hash) return { ok: false, error: "Usuário sem senha definida." };
  const currentOk = await bcrypt.compare(currentPw, hash);
  if (!currentOk) return { ok: false, error: "A senha atual está incorreta." };
  const policy = validatePassword(newPw);
  if (!policy.ok) return { ok: false, error: policy.error };
  const sameAsOld = await bcrypt.compare(newPw, hash);
  if (sameAsOld) return { ok: false, error: "A nova senha deve ser diferente da atual." };
  const newHash = await bcrypt.hash(newPw, 10);
  await db
    .update(appUser)
    .set({ passwordHash: newHash, passwordUpdatedAt: new Date(), updatedAt: new Date() })
    .where(eq(appUser.id, userId));
  await logAudit(tenantId, userId, "security.password_change", "security", userId, "Senha alterada", { actorName });
  return { ok: true };
}
