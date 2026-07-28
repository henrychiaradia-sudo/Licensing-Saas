import "server-only";
import { and, eq, desc, sql, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  notification,
  contract,
  receivable,
  nonConformity,
  task,
  legalCase,
} from "@/lib/db/schema";
import type { NotificationType } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";

export async function listNotifications(tenantId: string, opts?: { onlyUnread?: boolean }) {
  const conds = [eq(notification.tenantId, tenantId)];
  if (opts?.onlyUnread) conds.push(isNull(notification.readAt));
  return db
    .select()
    .from(notification)
    .where(and(...conds))
    .orderBy(desc(notification.createdAt))
    .limit(100);
}

export async function unreadCount(tenantId: string): Promise<number> {
  const r = await db
    .select({ c: sql<string>`count(*)` })
    .from(notification)
    .where(and(eq(notification.tenantId, tenantId), isNull(notification.readAt)));
  return Number(r[0]?.c ?? 0);
}

export async function markRead(tenantId: string, id: string): Promise<void> {
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.id, id), eq(notification.tenantId, tenantId), isNull(notification.readAt)));
}

export async function markAllRead(tenantId: string): Promise<void> {
  await db
    .update(notification)
    .set({ readAt: new Date() })
    .where(and(eq(notification.tenantId, tenantId), isNull(notification.readAt)));
}

type NewNotification = {
  type: NotificationType;
  severity: "info" | "warn" | "danger" | "success";
  title: string;
  body: string;
  entityType: string;
  entityId: string | null;
  link: string;
  dedupeKey: string;
};

function addDays(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Deriva notificações de sinais reais do sistema (contratos a vencer, recebíveis
 * vencidos, NCs críticas, tarefas atrasadas, prazos jurídicos) e insere apenas as
 * que ainda não têm uma notificação NÃO LIDA equivalente (dedupe por chave). Para
 * as de severidade "danger", dispara o adaptador de e-mail. Retorna quantas foram
 * criadas. Nunca lança.
 */
export async function generateNotifications(tenantId: string): Promise<number> {
  try {
    const t = today();
    const candidates: NewNotification[] = [];

    // 1. Contratos a vencer (≤30 dias)
    const contracts = await db
      .select({ id: contract.id, number: contract.contractNumber, endDate: contract.endDate })
      .from(contract)
      .where(
        and(
          eq(contract.tenantId, tenantId),
          sql`${contract.status} in ('vigente','renovado')`,
          sql`${contract.endDate} is not null and ${contract.endDate} between ${t} and ${addDays(30)}`,
        ),
      )
      .limit(50);
    for (const c of contracts) {
      candidates.push({
        type: "contract_expiring",
        severity: "warn",
        title: `Contrato ${c.number} a vencer`,
        body: `Vigência termina em ${c.endDate}. Avalie renovação ou aditivo.`,
        entityType: "contract",
        entityId: c.id,
        link: `/contratos/${c.id}`,
        dedupeKey: `contract_expiring:${c.id}`,
      });
    }

    // 2. Recebíveis vencidos
    const overdue = await db
      .select({ id: receivable.id, dueDate: receivable.dueDate, amount: receivable.amount })
      .from(receivable)
      .where(
        and(
          eq(receivable.tenantId, tenantId),
          sql`${receivable.status} not in ('pago','cancelado')`,
          sql`${receivable.dueDate} < ${t}`,
        ),
      )
      .limit(50);
    for (const r of overdue) {
      candidates.push({
        type: "receivable_overdue",
        severity: "danger",
        title: `Recebível vencido`,
        body: `Vencido em ${r.dueDate} — R$ ${Number(r.amount).toLocaleString("pt-BR")}.`,
        entityType: "receivable",
        entityId: r.id,
        link: `/financeiro`,
        dedupeKey: `receivable_overdue:${r.id}`,
      });
    }

    // 3. Não-conformidades críticas abertas
    const ncs = await db
      .select({ id: nonConformity.id, number: nonConformity.ncNumber, description: nonConformity.description })
      .from(nonConformity)
      .where(
        and(
          eq(nonConformity.tenantId, tenantId),
          eq(nonConformity.severity, "critica"),
          eq(nonConformity.status, "aberta"),
        ),
      )
      .limit(50);
    for (const n of ncs) {
      candidates.push({
        type: "quality_nc",
        severity: "danger",
        title: `NC crítica aberta ${n.number}`,
        body: n.description.slice(0, 140),
        entityType: "non_conformity",
        entityId: n.id,
        link: `/qualidade`,
        dedupeKey: `quality_nc:${n.id}`,
      });
    }

    // 4. Tarefas atrasadas
    const tasks = await db
      .select({ id: task.id, title: task.title, dueDate: task.dueDate })
      .from(task)
      .where(
        and(
          eq(task.tenantId, tenantId),
          sql`${task.status} in ('a_fazer','em_andamento')`,
          sql`${task.dueDate} is not null and ${task.dueDate} < ${t}`,
        ),
      )
      .limit(50);
    for (const tk of tasks) {
      candidates.push({
        type: "task_overdue",
        severity: "warn",
        title: `Tarefa atrasada`,
        body: `"${tk.title}" venceu em ${tk.dueDate}.`,
        entityType: "task",
        entityId: tk.id,
        link: `/tarefas`,
        dedupeKey: `task_overdue:${tk.id}`,
      });
    }

    // 5. Prazos jurídicos próximos (≤15 dias)
    const cases = await db
      .select({ id: legalCase.id, number: legalCase.caseNumber, title: legalCase.title, dueDate: legalCase.dueDate })
      .from(legalCase)
      .where(
        and(
          eq(legalCase.tenantId, tenantId),
          sql`${legalCase.status} in ('aberto','em_andamento')`,
          sql`${legalCase.dueDate} is not null and ${legalCase.dueDate} between ${t} and ${addDays(15)}`,
        ),
      )
      .limit(50);
    for (const lc of cases) {
      candidates.push({
        type: "legal_deadline",
        severity: "warn",
        title: `Prazo jurídico ${lc.number}`,
        body: `"${lc.title}" tem prazo em ${lc.dueDate}.`,
        entityType: "legal_case",
        entityId: lc.id,
        link: `/juridico/${lc.id}`,
        dedupeKey: `legal_deadline:${lc.id}`,
      });
    }

    if (candidates.length === 0) return 0;

    // Dedupe: não recriar se já existe uma notificação NÃO LIDA com a mesma chave.
    const existing = await db
      .select({ key: notification.dedupeKey })
      .from(notification)
      .where(and(eq(notification.tenantId, tenantId), isNull(notification.readAt)));
    const seen = new Set(existing.map((e) => e.key).filter(Boolean));
    const fresh = candidates.filter((c) => !seen.has(c.dedupeKey));
    if (fresh.length === 0) return 0;

    const inserted = await db
      .insert(notification)
      .values(
        fresh.map((c) => ({
          tenantId,
          type: c.type,
          severity: c.severity,
          title: c.title,
          body: c.body,
          entityType: c.entityType,
          entityId: c.entityId,
          link: c.link,
          dedupeKey: c.dedupeKey,
        })),
      )
      .returning({ id: notification.id, severity: notification.severity });

    // Dispara e-mail (stub) para as de severidade danger recém-criadas.
    const danger = inserted.filter((i) => i.severity === "danger");
    if (danger.length > 0) {
      await sendEmail({
        to: "operacoes@novasport.example",
        subject: `ALIANZA — ${danger.length} alerta(s) que exigem atenção`,
        body: `Há ${danger.length} novo(s) alerta(s) de severidade alta. Acesse o sistema para detalhes.`,
      });
      const ids = danger.map((d) => d.id);
      await db
        .update(notification)
        .set({ emailedAt: new Date() })
        .where(sql`${notification.id} = any(${ids})`);
    }

    return fresh.length;
  } catch {
    return 0;
  }
}
