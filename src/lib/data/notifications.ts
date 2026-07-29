import "server-only";
import { and, eq, desc, sql, isNull, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  notification,
  notificationPreference,
  notificationWebhook,
  contract,
  receivable,
  nonConformity,
  task,
  legalCase,
  appUser,
} from "@/lib/db/schema";
import type { NotificationType } from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";
import { NOTIF_LABEL, NOTIF_PREF_ORDER, type NotifChannel } from "@/lib/notif-meta";

type Severity = "info" | "warn" | "danger" | "success";

/* ------------------------------------------------------------------ *
 * Leitura e marcação
 * ------------------------------------------------------------------ */

export async function listNotifications(
  tenantId: string,
  opts?: { onlyUnread?: boolean; type?: string },
) {
  const conds = [eq(notification.tenantId, tenantId)];
  if (opts?.onlyUnread) conds.push(isNull(notification.readAt));
  if (opts?.type) conds.push(eq(notification.type, opts.type as NotificationType));
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

/** Distribuição por tipo (para os filtros/resumo da tela). */
export async function countsByType(tenantId: string) {
  const rows = await db
    .select({
      type: notification.type,
      total: sql<string>`count(*)`,
      unread: sql<string>`count(*) filter (where ${notification.readAt} is null)`,
    })
    .from(notification)
    .where(eq(notification.tenantId, tenantId))
    .groupBy(notification.type);
  return rows.map((r) => ({ type: r.type as string, total: Number(r.total), unread: Number(r.unread) }));
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

/* ------------------------------------------------------------------ *
 * Geração a partir de dados reais (14 sinais → 12 eventos do escopo)
 * ------------------------------------------------------------------ */

type NewNotification = {
  type: NotificationType;
  severity: Severity;
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

async function rawRows<T = Record<string, unknown>>(query: ReturnType<typeof sql>): Promise<T[]> {
  const res = await db.execute(query);
  return res as unknown as T[];
}

export async function generateNotifications(tenantId: string): Promise<number> {
  const t = today();
  const candidates: NewNotification[] = [];
  const push = (n: NewNotification) => candidates.push(n);
  // Cada sinal é isolado: uma falha pontual não impede os demais.
  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
    } catch {
      /* ignora este sinal */
    }
  };

  // 1. Contratos a vencer (≤30d)
  await run(async () => {
    const rows = await db
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
    for (const c of rows)
      push({
        type: "contract_expiring",
        severity: "warn",
        title: `Contrato ${c.number} a vencer`,
        body: `Vigência termina em ${c.endDate}. Avalie renovação ou aditivo.`,
        entityType: "contract",
        entityId: c.id,
        link: `/contratos/${c.id}`,
        dedupeKey: `contract_expiring:${c.id}`,
      });
  });

  // 2. Recebíveis vencidos → "Pagamento vencido"
  await run(async () => {
    const rows = await db
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
    for (const r of rows)
      push({
        type: "receivable_overdue",
        severity: "danger",
        title: `Pagamento vencido`,
        body: `Vencido em ${r.dueDate} — R$ ${Number(r.amount).toLocaleString("pt-BR")}.`,
        entityType: "receivable",
        entityId: r.id,
        link: `/financeiro`,
        dedupeKey: `receivable_overdue:${r.id}`,
      });
  });

  // 3. NCs críticas abertas → "Não conformidade"
  await run(async () => {
    const rows = await db
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
    for (const n of rows)
      push({
        type: "quality_nc",
        severity: "danger",
        title: `NC crítica aberta ${n.number}`,
        body: (n.description ?? "").slice(0, 140),
        entityType: "non_conformity",
        entityId: n.id,
        link: `/qualidade`,
        dedupeKey: `quality_nc:${n.id}`,
      });
  });

  // 4. Tarefas atrasadas
  await run(async () => {
    const rows = await db
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
    for (const tk of rows)
      push({
        type: "task_overdue",
        severity: "warn",
        title: `Tarefa atrasada`,
        body: `"${tk.title}" venceu em ${tk.dueDate}.`,
        entityType: "task",
        entityId: tk.id,
        link: `/tarefas`,
        dedupeKey: `task_overdue:${tk.id}`,
      });
  });

  // 5. Prazos jurídicos (≤15d)
  await run(async () => {
    const rows = await db
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
    for (const lc of rows)
      push({
        type: "legal_deadline",
        severity: "warn",
        title: `Prazo jurídico ${lc.number}`,
        body: `"${lc.title}" tem prazo em ${lc.dueDate}.`,
        entityType: "legal_case",
        entityId: lc.id,
        link: `/juridico/${lc.id}`,
        dedupeKey: `legal_deadline:${lc.id}`,
      });
  });

  // 6. Aprovação pendente (requisições enviadas)
  await run(async () => {
    const rows = await rawRows<{ id: string; num: string; requester: string }>(
      sql`select pr.id, pr.requisition_number as num, coalesce(u.name,'—') as requester
          from purchase_requisition pr left join app_user u on u.id = pr.requester_user_id
          where pr.tenant_id = ${tenantId} and pr.status = 'enviada'
          order by pr.created_at desc limit 50`,
    );
    for (const r of rows)
      push({
        type: "approval_pending",
        severity: "warn",
        title: `Requisição ${r.num} aguardando aprovação`,
        body: `Solicitada por ${r.requester}. Há decisão de alçada pendente.`,
        entityType: "purchase_requisition",
        entityId: r.id,
        link: `/aprovacoes`,
        dedupeKey: `approval_pending:${r.id}`,
      });
  });

  // 7. Reprovação (requisições reprovadas nos últimos 14 dias)
  await run(async () => {
    const rows = await rawRows<{ id: string; num: string; comment: string | null }>(
      sql`select pr.id, pr.requisition_number as num, pr.decision_comment as comment
          from purchase_requisition pr
          where pr.tenant_id = ${tenantId} and pr.status = 'reprovada' and pr.decided_at >= (current_date - 14)
          order by pr.decided_at desc limit 50`,
    );
    for (const r of rows)
      push({
        type: "approval_rejected",
        severity: "warn",
        title: `Requisição ${r.num} reprovada`,
        body: r.comment ? String(r.comment).slice(0, 140) : "Requisição reprovada na alçada.",
        entityType: "purchase_requisition",
        entityId: r.id,
        link: `/requisicoes/${r.id}`,
        dedupeKey: `approval_rejected:${r.id}`,
      });
  });

  // 8. Documento de fornecedor vencendo (≤30d)
  await run(async () => {
    const rows = await rawRows<{ id: string; name: string; valid_until: string; supplier: string }>(
      sql`select d.id, d.name, d.valid_until::text as valid_until,
                 coalesce(s.trade_name, s.legal_name, 'Fornecedor') as supplier
          from supplier_document d left join supplier s on s.id = d.supplier_id
          where d.tenant_id = ${tenantId} and d.status <> 'vencido' and d.valid_until is not null
            and d.valid_until between current_date and (current_date + 30)
          order by d.valid_until asc limit 50`,
    );
    for (const r of rows)
      push({
        type: "document_expiring",
        severity: "warn",
        title: `Documento vencendo: ${r.name}`,
        body: `${r.supplier} — válido até ${r.valid_until}.`,
        entityType: "supplier_document",
        entityId: r.id,
        link: `/documentos`,
        dedupeKey: `document_expiring:${r.id}`,
      });
  });

  // 9. Pedido de compra atrasado
  await run(async () => {
    const rows = await rawRows<{ id: string; num: string; expected_date: string }>(
      sql`select po.id, po.po_number as num, po.expected_date::text as expected_date
          from purchase_order po
          where po.tenant_id = ${tenantId} and po.status not in ('recebido','cancelado')
            and po.expected_date is not null and po.expected_date < current_date and po.received_date is null
          order by po.expected_date asc limit 50`,
    );
    for (const r of rows)
      push({
        type: "purchase_order_late",
        severity: "warn",
        title: `Pedido ${r.num} atrasado`,
        body: `Entrega prevista para ${r.expected_date} ainda não recebida.`,
        entityType: "purchase_order",
        entityId: r.id,
        link: `/compras/${r.id}`,
        dedupeKey: `purchase_order_late:${r.id}`,
      });
  });

  // 10. Cotação (sourcing) encerrando (≤7d)
  await run(async () => {
    const rows = await rawRows<{ id: string; title: string; due_date: string }>(
      sql`select se.id, se.title, se.due_date::text as due_date
          from sourcing_event se
          where se.tenant_id = ${tenantId} and se.status = 'aberto' and se.due_date is not null
            and se.due_date between current_date and (current_date + 7)
          order by se.due_date asc limit 50`,
    );
    for (const r of rows)
      push({
        type: "sourcing_closing",
        severity: "warn",
        title: `Cotação encerrando: ${r.title}`,
        body: `Prazo para recebimento de propostas até ${r.due_date}.`,
        entityType: "sourcing_event",
        entityId: r.id,
        link: `/sourcing/${r.id}`,
        dedupeKey: `sourcing_closing:${r.id}`,
      });
  });

  // 11. Produto aguardando revisão (dentro do SLA)
  await run(async () => {
    const rows = await rawRows<{ id: string; product_id: string; pname: string; sla: string | null }>(
      sql`select pa.id, pa.product_id, coalesce(p.name, p.sku, 'Produto') as pname, pa.sla_due_date::text as sla
          from product_approval pa left join product p on p.id = pa.product_id
          where pa.tenant_id = ${tenantId} and pa.status in ('submetido','em_aprovacao') and pa.decided_at is null
            and (pa.sla_due_date is null or pa.sla_due_date >= current_date)
          order by pa.submitted_at desc nulls last limit 50`,
    );
    for (const r of rows)
      push({
        type: "product_review_pending",
        severity: "warn",
        title: `Produto aguardando revisão: ${r.pname}`,
        body: r.sla ? `SLA de aprovação até ${r.sla}.` : `Aprovação de produto pendente de revisão.`,
        entityType: "product_approval",
        entityId: r.id,
        link: `/produtos/${r.product_id}`,
        dedupeKey: `product_review_pending:${r.id}`,
      });
  });

  // 12. SLA vencido (revisão de produto além do prazo)
  await run(async () => {
    const rows = await rawRows<{ id: string; product_id: string; pname: string; sla: string }>(
      sql`select pa.id, pa.product_id, coalesce(p.name, p.sku, 'Produto') as pname, pa.sla_due_date::text as sla
          from product_approval pa left join product p on p.id = pa.product_id
          where pa.tenant_id = ${tenantId} and pa.status in ('submetido','em_aprovacao') and pa.decided_at is null
            and pa.sla_due_date is not null and pa.sla_due_date < current_date
          order by pa.sla_due_date asc limit 50`,
    );
    for (const r of rows)
      push({
        type: "sla_breached",
        severity: "danger",
        title: `SLA vencido: ${r.pname}`,
        body: `A revisão do produto passou do prazo de SLA (${r.sla}).`,
        entityType: "product_approval",
        entityId: r.id,
        link: `/produtos/${r.product_id}`,
        dedupeKey: `sla_breached:${r.id}`,
      });
  });

  // 13. Fornecedor com risco elevado (avaliação alto/crítico)
  await run(async () => {
    const rows = await rawRows<{ supplier_id: string; supplier: string; risk_level: string }>(
      sql`select distinct on (s.id) s.id as supplier_id,
                 coalesce(s.trade_name, s.legal_name, 'Fornecedor') as supplier, ev.risk_level
          from supplier_evaluation ev join supplier s on s.id = ev.supplier_id
          where ev.tenant_id = ${tenantId} and ev.risk_level in ('alto','critico') and s.deleted_at is null
          order by s.id, ev.evaluated_at desc nulls last limit 50`,
    );
    for (const r of rows)
      push({
        type: "supplier_high_risk",
        severity: r.risk_level === "critico" ? "danger" : "warn",
        title: `Fornecedor com risco ${r.risk_level}: ${r.supplier}`,
        body: `Avaliação de risco elevada. Reveja homologação, contratos e plano de ação.`,
        entityType: "supplier",
        entityId: r.supplier_id,
        link: `/fornecedores/${r.supplier_id}`,
        dedupeKey: `supplier_high_risk:${r.supplier_id}`,
      });
  });

  // 14. Reporte de royalties atrasado (rascunho com período encerrado)
  await run(async () => {
    const rows = await rawRows<{ id: string; ref: string; period_end: string }>(
      sql`select rr.id, coalesce(rr.reference_label,'reporte') as ref, rr.period_end::text as period_end
          from royalty_report rr
          where rr.tenant_id = ${tenantId} and rr.status = 'rascunho'
            and rr.period_end is not null and rr.period_end < current_date and rr.submitted_at is null
          order by rr.period_end asc limit 50`,
    );
    for (const r of rows)
      push({
        type: "report_late",
        severity: "warn",
        title: `Reporte atrasado: ${r.ref}`,
        body: `Período encerrado em ${r.period_end} sem envio do reporte de royalties.`,
        entityType: "royalty_report",
        entityId: r.id,
        link: `/royalties/${r.id}`,
        dedupeKey: `report_late:${r.id}`,
      });
  });

  if (candidates.length === 0) return 0;

  try {
    // Dedupe: não recriar se já existe notificação NÃO LIDA com a mesma chave.
    const existing = await db
      .select({ key: notification.dedupeKey })
      .from(notification)
      .where(and(eq(notification.tenantId, tenantId), isNull(notification.readAt)));
    const seen = new Set(existing.map((e) => e.key).filter(Boolean));
    const fresh = candidates.filter((c) => !seen.has(c.dedupeKey));
    if (fresh.length === 0) return 0;

    const channelsByType = await computeChannelsByType(tenantId, [...new Set(fresh.map((f) => f.type))]);

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
          channels: channelsByType[c.type] ?? "in_app",
        })),
      )
      .returning({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        channels: notification.channels,
      });

    // Canal e-mail (adaptador stub) para os destinatários que optaram por e-mail.
    const emailOnes = inserted.filter((i) => (i.channels ?? "").includes("email"));
    if (emailOnes.length > 0) {
      const emailTypes = [...new Set(emailOnes.map((i) => i.type as string))];
      const recipients = await db
        .select({ email: appUser.email })
        .from(notificationPreference)
        .innerJoin(appUser, eq(appUser.id, notificationPreference.userId))
        .where(
          and(
            eq(notificationPreference.tenantId, tenantId),
            eq(notificationPreference.email, true),
            inArray(notificationPreference.type, emailTypes),
          ),
        );
      const to = [...new Set(recipients.map((r) => r.email).filter(Boolean))];
      if (to.length > 0) {
        await sendEmail({
          to: to.join(","),
          subject: `ALIANZA — ${emailOnes.length} nova(s) notificação(ões)`,
          body: `Você tem ${emailOnes.length} nova(s) notificação(ões) no ALIANZA. Acesse o sistema para os detalhes.`,
        });
        await db
          .update(notification)
          .set({ emailedAt: new Date() })
          .where(inArray(notification.id, emailOnes.map((i) => i.id)));
      }
    }

    // Canal webhook (best-effort) — só quando há webhook ativo cobrindo o tipo.
    const webhookOnes = inserted.filter((i) => (i.channels ?? "").includes("webhook"));
    if (webhookOnes.length > 0) {
      await dispatchWebhooks(
        tenantId,
        webhookOnes.map((i) => ({ type: i.type as string, title: i.title })),
      );
    }

    return fresh.length;
  } catch {
    return 0;
  }
}

/* ------------------------------------------------------------------ *
 * Canais / roteamento
 * ------------------------------------------------------------------ */

async function computeChannelsByType(tenantId: string, types: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const t of types) out[t] = "in_app";
  if (types.length === 0) return out;

  const emailPrefs = await db
    .select({ type: notificationPreference.type })
    .from(notificationPreference)
    .where(
      and(
        eq(notificationPreference.tenantId, tenantId),
        eq(notificationPreference.email, true),
        inArray(notificationPreference.type, types),
      ),
    );
  const emailTypes = new Set(emailPrefs.map((p) => p.type));

  const hooks = await db
    .select({ events: notificationWebhook.events })
    .from(notificationWebhook)
    .where(and(eq(notificationWebhook.tenantId, tenantId), eq(notificationWebhook.active, true)));
  const covers = (type: string) =>
    hooks.some((h) => h.events === "all" || h.events.split(",").map((s) => s.trim()).includes(type));

  for (const t of types) {
    const ch = ["in_app"];
    if (emailTypes.has(t)) ch.push("email");
    if (covers(t)) ch.push("webhook");
    out[t] = ch.join(",");
  }
  return out;
}

async function dispatchWebhooks(tenantId: string, items: Array<{ type: string; title: string }>): Promise<void> {
  try {
    const hooks = await db
      .select()
      .from(notificationWebhook)
      .where(and(eq(notificationWebhook.tenantId, tenantId), eq(notificationWebhook.active, true)));
    for (const h of hooks) {
      const relevant = items.filter(
        (i) => h.events === "all" || h.events.split(",").map((s) => s.trim()).includes(i.type),
      );
      if (relevant.length === 0) continue;
      let status = "ok";
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 2500);
        const res = await fetch(h.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(h.secret ? { "X-Alianza-Signature": h.secret } : {}),
          },
          body: JSON.stringify({ source: "alianza", count: relevant.length, events: relevant }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        status = res.ok ? `entregue_${res.status}` : `falha_http_${res.status}`;
      } catch {
        status = "falha_conexao";
      }
      await db
        .update(notificationWebhook)
        .set({ lastStatus: status, lastDeliveredAt: new Date() })
        .where(eq(notificationWebhook.id, h.id));
    }
  } catch {
    /* nunca bloqueia a geração de notificações */
  }
}

/* ------------------------------------------------------------------ *
 * Preferências por usuário
 * ------------------------------------------------------------------ */

export type PreferenceRow = {
  type: string;
  label: string;
  inApp: boolean;
  email: boolean;
  webhook: boolean;
  push: boolean;
};

export async function getPreferences(tenantId: string, userId: string): Promise<PreferenceRow[]> {
  const rows = await db
    .select()
    .from(notificationPreference)
    .where(and(eq(notificationPreference.tenantId, tenantId), eq(notificationPreference.userId, userId)));
  const map = new Map(rows.map((r) => [r.type, r]));
  return NOTIF_PREF_ORDER.map((type) => {
    const r = map.get(type);
    return {
      type,
      label: NOTIF_LABEL[type] ?? type,
      inApp: r ? r.inApp : true,
      email: r ? r.email : false,
      webhook: r ? r.webhook : false,
      push: r ? r.push : false,
    };
  });
}

export async function setPreference(
  tenantId: string,
  userId: string,
  type: string,
  channel: NotifChannel,
  on: boolean,
): Promise<void> {
  if (!NOTIF_PREF_ORDER.includes(type)) return;
  const row = {
    tenantId,
    userId,
    type,
    inApp: channel === "inApp" ? on : true,
    email: channel === "email" ? on : false,
    webhook: channel === "webhook" ? on : false,
    push: channel === "push" ? on : false,
  };
  const patch =
    channel === "inApp"
      ? { inApp: on }
      : channel === "email"
        ? { email: on }
        : channel === "webhook"
          ? { webhook: on }
          : { push: on };
  await db
    .insert(notificationPreference)
    .values(row)
    .onConflictDoUpdate({
      target: [notificationPreference.tenantId, notificationPreference.userId, notificationPreference.type],
      set: { ...patch, updatedAt: new Date() },
    });
}

/* ------------------------------------------------------------------ *
 * Webhooks
 * ------------------------------------------------------------------ */

export async function listWebhooks(tenantId: string) {
  return db
    .select()
    .from(notificationWebhook)
    .where(eq(notificationWebhook.tenantId, tenantId))
    .orderBy(desc(notificationWebhook.createdAt));
}

export async function createWebhook(
  tenantId: string,
  input: { label: string | null; url: string; events: string; secret: string | null },
  userId: string,
): Promise<void> {
  await db.insert(notificationWebhook).values({
    tenantId,
    label: input.label,
    url: input.url,
    events: input.events || "all",
    secret: input.secret,
    createdBy: userId,
  });
}

export async function setWebhookActive(tenantId: string, id: string, active: boolean): Promise<void> {
  await db
    .update(notificationWebhook)
    .set({ active })
    .where(and(eq(notificationWebhook.id, id), eq(notificationWebhook.tenantId, tenantId)));
}

export async function removeWebhook(tenantId: string, id: string): Promise<void> {
  await db
    .delete(notificationWebhook)
    .where(and(eq(notificationWebhook.id, id), eq(notificationWebhook.tenantId, tenantId)));
}

export async function testWebhook(tenantId: string, id: string): Promise<{ ok: boolean; status: string }> {
  const rows = await db
    .select()
    .from(notificationWebhook)
    .where(and(eq(notificationWebhook.id, id), eq(notificationWebhook.tenantId, tenantId)))
    .limit(1);
  const h = rows[0];
  if (!h) return { ok: false, status: "nao_encontrado" };
  let status = "ok";
  let ok = false;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(h.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(h.secret ? { "X-Alianza-Signature": h.secret } : {}),
      },
      body: JSON.stringify({ source: "alianza", test: true, message: "Teste de webhook do ALIANZA." }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    ok = res.ok;
    status = res.ok ? `entregue_${res.status}` : `falha_http_${res.status}`;
  } catch {
    status = "falha_conexao";
  }
  await db
    .update(notificationWebhook)
    .set({ lastStatus: status, lastDeliveredAt: new Date() })
    .where(eq(notificationWebhook.id, h.id));
  return { ok, status };
}
