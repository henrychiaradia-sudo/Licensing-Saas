import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { getLicenseePendencias } from "./alerts";

/**
 * Camada de dados ESCOPADA ao licenciado (portal). Tudo é somente leitura e
 * filtrado por (tenantId, licenseeId) — o licenciado nunca vê dados de outros.
 * Usa SQL bruto com nomes de coluna verificados; agrega no banco e formata em JS.
 */

async function rawRows<T = Record<string, unknown>>(query: ReturnType<typeof sql>): Promise<T[]> {
  const res = await db.execute(query);
  return res as unknown as T[];
}

const num = (v: unknown) => Number(v ?? 0);

/* ------------------------------------------------------------------ *
 * Painel (dashboard) do licenciado
 * ------------------------------------------------------------------ */

export async function portalDashboard(tenantId: string, licenseeId: string) {
  const T = tenantId;
  const L = licenseeId;

  const kpiRows = await rawRows<Record<string, string>>(sql`
    select
      (select count(*) from contract where tenant_id=${T} and licensee_id=${L} and status='vigente')::int as active_contracts,
      (select coalesce(sum(royalty_calculated),0) from royalty_report where tenant_id=${T} and licensee_id=${L}) as royalties_ytd,
      (select coalesce(sum(amount - paid_amount),0) from receivable where tenant_id=${T} and licensee_id=${L} and status not in ('pago','cancelado')) as outstanding,
      (select coalesce(sum(amount - paid_amount),0) from receivable where tenant_id=${T} and licensee_id=${L} and status not in ('pago','cancelado') and due_date < current_date) as overdue,
      (select coalesce(sum(paid_amount),0) from receivable where tenant_id=${T} and licensee_id=${L}) as paid,
      (select coalesce(sum(net_amount),0) from invoice where tenant_id=${T} and licensee_id=${L}) as billed,
      (select count(*) from royalty_report where tenant_id=${T} and licensee_id=${L} and status in ('rascunho','com_divergencia'))::int as pending_reports,
      (select count(*) from product where tenant_id=${T} and licensee_id=${L} and deleted_at is null)::int as products,
      (select coalesce(sum(minimum_guarantee_total),0) from contract where tenant_id=${T} and licensee_id=${L} and status='vigente') as mg_total
  `);
  const k = kpiRows[0] ?? {};
  const royaltiesYtd = num(k.royalties_ytd);
  const mgTotal = num(k.mg_total);
  const mgRealizedPct = mgTotal > 0 ? Math.min(100, (royaltiesYtd / mgTotal) * 100) : 0;

  const timeline = await rawRows<{ ym: string; royalties: string; billed: string }>(sql`
    with months as (
      select to_char(date_trunc('month', current_date) - (interval '1 month' * g), 'YYYY-MM') as ym
      from generate_series(0,11) g
    ),
    roy as (
      select to_char(date_trunc('month', period_start),'YYYY-MM') as ym, sum(royalty_calculated) as v
      from royalty_report where tenant_id=${T} and licensee_id=${L} and period_start is not null group by 1
    ),
    bil as (
      select to_char(date_trunc('month', issue_date),'YYYY-MM') as ym, sum(net_amount) as v
      from invoice where tenant_id=${T} and licensee_id=${L} and issue_date is not null group by 1
    )
    select m.ym, coalesce(roy.v,0) as royalties, coalesce(bil.v,0) as billed
    from months m left join roy on roy.ym=m.ym left join bil on bil.ym=m.ym
    order by m.ym asc
  `);

  const aging = await rawRows<{ bucket: string; v: string }>(sql`
    select case
      when due_date >= current_date then 'A vencer'
      when due_date >= current_date - 30 then 'Vencido ≤30d'
      when due_date >= current_date - 60 then 'Vencido 31–60d'
      else 'Vencido +60d' end as bucket,
      sum(amount - paid_amount) as v
    from receivable where tenant_id=${T} and licensee_id=${L} and status not in ('pago','cancelado')
    group by 1
  `);

  const royaltyMix = await rawRows<{ status: string; c: string }>(sql`
    select status::text as status, count(*)::int as c
    from royalty_report where tenant_id=${T} and licensee_id=${L} group by 1
  `);

  const contractMix = await rawRows<{ status: string; c: string }>(sql`
    select status::text as status, count(*)::int as c
    from contract where tenant_id=${T} and licensee_id=${L} group by 1
  `);

  const pend = await getLicenseePendencias(tenantId, licenseeId);

  return {
    kpis: {
      activeContracts: num(k.active_contracts),
      royaltiesYtd,
      outstanding: num(k.outstanding),
      overdue: num(k.overdue),
      paid: num(k.paid),
      billed: num(k.billed),
      pendingReports: num(k.pending_reports),
      products: num(k.products),
      mgTotal,
      mgRealizedPct,
    },
    timeline: timeline.map((r) => ({
      label: r.ym.slice(5) + "/" + r.ym.slice(2, 4),
      royalties: num(r.royalties),
      billed: num(r.billed),
    })),
    aging: aging.map((r) => ({ label: r.bucket, value: num(r.v) })),
    royaltyMix: royaltyMix.map((r) => ({ label: r.status, value: num(r.c) })),
    contractMix: contractMix.map((r) => ({ label: r.status, value: num(r.c) })),
    pendencias: pend,
  };
}

/* ------------------------------------------------------------------ *
 * Controladoria (royalties apurado × declarado, notas fiscais, razão)
 * ------------------------------------------------------------------ */

export async function portalControladoria(tenantId: string, licenseeId: string) {
  const T = tenantId;
  const L = licenseeId;

  const reports = await rawRows<Record<string, string>>(sql`
    select rr.id, coalesce(rr.reference_label,'—') as ref, rr.status::text as status,
           rr.period_start::text as period_start,
           coalesce(rr.net_sales_total,0) as net_sales,
           coalesce(rr.royalty_declared,0) as declared,
           coalesce(rr.royalty_calculated,0) as calculated,
           coalesce(rr.variance,0) as variance,
           cur.iso_code as currency
    from royalty_report rr left join currency cur on cur.id = rr.currency_id
    where rr.tenant_id=${T} and rr.licensee_id=${L}
    order by rr.period_start desc nulls last limit 100
  `);

  const invoices = await rawRows<Record<string, string>>(sql`
    select i.id, coalesce(i.invoice_number,'—') as number, i.issue_date::text as issue_date,
           i.due_date::text as due_date, coalesce(i.gross_amount,0) as gross, coalesce(i.net_amount,0) as net,
           i.status::text as status, cur.iso_code as currency
    from invoice i left join currency cur on cur.id = i.currency_id
    where i.tenant_id=${T} and i.licensee_id=${L}
    order by i.issue_date desc nulls last limit 100
  `);

  const ledger = await rawRows<{ entry_type: string; total: string; c: string }>(sql`
    select entry_type::text as entry_type, coalesce(sum(amount),0) as total, count(*)::int as c
    from ledger_entry where tenant_id=${T} and licensee_id=${L} group by 1 order by 2 desc
  `);

  const totals = await rawRows<Record<string, string>>(sql`
    select
      (select coalesce(sum(royalty_declared),0) from royalty_report where tenant_id=${T} and licensee_id=${L}) as declared,
      (select coalesce(sum(royalty_calculated),0) from royalty_report where tenant_id=${T} and licensee_id=${L}) as calculated,
      (select coalesce(sum(net_amount),0) from invoice where tenant_id=${T} and licensee_id=${L}) as billed,
      (select count(*) from invoice where tenant_id=${T} and licensee_id=${L} and status not in ('paga','cancelada'))::int as open_invoices
  `);
  const t = totals[0] ?? {};

  return {
    reports: reports.map((r) => ({
      id: String(r.id),
      ref: String(r.ref),
      status: String(r.status),
      period: String(r.period_start ?? "—"),
      netSales: num(r.net_sales),
      declared: num(r.declared),
      calculated: num(r.calculated),
      variance: num(r.variance),
      currency: (r.currency as string) ?? "BRL",
    })),
    invoices: invoices.map((r) => ({
      id: String(r.id),
      number: String(r.number),
      issueDate: String(r.issue_date ?? "—"),
      dueDate: String(r.due_date ?? "—"),
      gross: num(r.gross),
      net: num(r.net),
      status: String(r.status),
      currency: (r.currency as string) ?? "BRL",
    })),
    ledger: ledger.map((r) => ({ type: r.entry_type, total: num(r.total), count: num(r.c) })),
    totals: {
      declared: num(t.declared),
      calculated: num(t.calculated),
      variance: num(t.calculated) - num(t.declared),
      billed: num(t.billed),
      openInvoices: num(t.open_invoices),
    },
  };
}

/* ------------------------------------------------------------------ *
 * Marketing (campanhas co-op / da marca do licenciado)
 * ------------------------------------------------------------------ */

export async function portalMarketing(tenantId: string, licenseeId: string) {
  const T = tenantId;
  const L = licenseeId;

  const campaigns = await rawRows<Record<string, string>>(sql`
    select mc.id, coalesce(mc.campaign_number,'—') as num, mc.name,
           mc.campaign_type::text as type, mc.status::text as status,
           coalesce(mc.budget,0) as budget, coalesce(mc.spent,0) as spent, coalesce(mc.revenue,0) as revenue,
           coalesce(mc.channel,'—') as channel, coalesce(mc.publico,'—') as publico,
           mc.start_date::text as start_date, mc.end_date::text as end_date, coalesce(mc.coop,false) as coop,
           b.name as brand
    from marketing_campaign mc left join brand b on b.id = mc.brand_id
    where mc.tenant_id=${T} and mc.licensee_id=${L}
    order by mc.start_date desc nulls last
  `);

  const budget = campaigns.reduce((a, c) => a + num(c.budget), 0);
  const spent = campaigns.reduce((a, c) => a + num(c.spent), 0);
  const revenue = campaigns.reduce((a, c) => a + num(c.revenue), 0);
  const active = campaigns.filter((c) => String(c.status) === "ativa" || String(c.status) === "em_andamento").length;

  return {
    campaigns: campaigns.map((c) => ({
      id: String(c.id),
      num: String(c.num),
      name: String(c.name),
      type: String(c.type),
      status: String(c.status),
      budget: num(c.budget),
      spent: num(c.spent),
      revenue: num(c.revenue),
      channel: String(c.channel),
      publico: String(c.publico),
      startDate: String(c.start_date ?? "—"),
      endDate: String(c.end_date ?? "—"),
      coop: String(c.coop) === "true",
      brand: (c.brand as string) ?? "—",
    })),
    kpis: {
      count: campaigns.length,
      active,
      budget,
      spent,
      revenue,
      roi: spent > 0 ? revenue / spent : 0,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Minhas Marcas (via contrato → contract_brand)
 * ------------------------------------------------------------------ */

export async function listPortalBrands(tenantId: string, licenseeId: string) {
  const rows = await rawRows<Record<string, string>>(sql`
    select b.id, b.name, coalesce(b.code,'—') as code, b.status::text as status,
           count(distinct p.id)::int as products,
           count(distinct c.id)::int as contracts
    from contract_brand cb
    join contract c on c.id = cb.contract_id
    join brand b on b.id = cb.brand_id
    left join product p on p.brand_id = b.id and p.licensee_id = ${licenseeId} and p.deleted_at is null
    where c.tenant_id=${tenantId} and c.licensee_id=${licenseeId}
    group by b.id, b.name, b.code, b.status
    order by b.name
  `);
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    code: String(r.code),
    status: String(r.status),
    products: num(r.products),
    contracts: num(r.contracts),
  }));
}

/* ------------------------------------------------------------------ *
 * Sinais escopados → Assistente IA + Notificações do portal
 * ------------------------------------------------------------------ */

async function portalSignals(tenantId: string, licenseeId: string) {
  const T = tenantId;
  const L = licenseeId;
  const pend = await getLicenseePendencias(tenantId, licenseeId);

  const extra = await rawRows<Record<string, string>>(sql`
    select
      (select count(*) from receivable where tenant_id=${T} and licensee_id=${L} and status not in ('pago','cancelado') and due_date < current_date)::int as overdue_count,
      (select coalesce(sum(amount - paid_amount),0) from receivable where tenant_id=${T} and licensee_id=${L} and status not in ('pago','cancelado') and due_date < current_date) as overdue_value,
      (select count(*) from product p join product_approval pa on pa.product_id=p.id and pa.version=p.current_version
         where p.tenant_id=${T} and p.licensee_id=${L} and pa.decided_at is null and p.deleted_at is null)::int as pending_products,
      (select count(*) from contract where tenant_id=${T} and licensee_id=${L} and status in ('vigente','renovado') and end_date is not null and end_date between current_date and current_date + 60)::int as expiring_contracts
  `);
  const e = extra[0] ?? {};

  const trend = await rawRows<{ ym: string; v: string }>(sql`
    select to_char(date_trunc('month', period_start),'YYYY-MM') as ym, sum(royalty_calculated) as v
    from royalty_report where tenant_id=${T} and licensee_id=${L} and period_start is not null
    group by 1 order by 1 desc limit 2
  `);
  const current = trend[0] ? num(trend[0].v) : 0;
  const previous = trend[1] ? num(trend[1].v) : 0;
  const trendPct = previous > 0 ? ((current - previous) / previous) * 100 : 0;

  const expiring = await rawRows<Record<string, string>>(sql`
    select id, contract_number as num, end_date::text as end_date
    from contract where tenant_id=${T} and licensee_id=${L} and status in ('vigente','renovado')
      and end_date is not null and end_date between current_date and current_date + 60
    order by end_date asc limit 20
  `);

  return {
    pend,
    overdueCount: num(e.overdue_count),
    overdueValue: num(e.overdue_value),
    pendingProducts: num(e.pending_products),
    expiringContractsCount: num(e.expiring_contracts),
    expiringContracts: expiring.map((r) => ({ id: String(r.id), num: String(r.num), endDate: String(r.end_date) })),
    royaltyCurrent: current,
    royaltyPrevious: previous,
    royaltyTrendPct: trendPct,
  };
}

export type PortalAlert = {
  severity: "info" | "warn" | "danger" | "success";
  title: string;
  body: string;
  link: string;
};

/** Central de avisos do licenciado (deriva dos dados reais dele). */
export async function portalAlerts(tenantId: string, licenseeId: string): Promise<PortalAlert[]> {
  const s = await portalSignals(tenantId, licenseeId);
  const out: PortalAlert[] = [];

  for (const p of s.pend.reprovedProducts)
    out.push({
      severity: "danger",
      title: `Produto reprovado: ${p.name}`,
      body: `SKU ${p.sku} — reenvie uma nova versão para retomar a aprovação.`,
      link: `/portal/produtos/${p.id}/reenviar`,
    });
  for (const r of s.pend.divergentReports)
    out.push({
      severity: "warn",
      title: `Reporte com divergência: ${r.referenceLabel}`,
      body: `O reporte tem apontamentos de validação. Revise para prosseguir.`,
      link: `/portal/royalties/${r.id}`,
    });
  if (s.overdueCount > 0)
    out.push({
      severity: "danger",
      title: `${s.overdueCount} pagamento(s) vencido(s)`,
      body: `Total em aberto vencido: R$ ${s.overdueValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`,
      link: `/portal/financeiro`,
    });
  for (const c of s.expiringContracts)
    out.push({
      severity: "warn",
      title: `Contrato ${c.num} a vencer`,
      body: `Vigência termina em ${c.endDate}. Fale com seu gestor sobre renovação.`,
      link: `/portal/contratos`,
    });
  if (s.pendingProducts > 0)
    out.push({
      severity: "info",
      title: `${s.pendingProducts} produto(s) em aprovação`,
      body: `Acompanhe o andamento das alçadas de aprovação.`,
      link: `/portal/produtos`,
    });

  return out;
}

export async function portalAlertCount(tenantId: string, licenseeId: string): Promise<number> {
  const a = await portalAlerts(tenantId, licenseeId);
  return a.length;
}

export type PortalInsight = {
  category: string;
  severity: "info" | "warn" | "danger" | "success";
  title: string;
  body: string;
  link?: string;
};

/** Assistente IA do licenciado: insights + recomendações sobre os dados dele. */
export async function portalInsights(tenantId: string, licenseeId: string) {
  const s = await portalSignals(tenantId, licenseeId);
  const insights: PortalInsight[] = [];
  const recommendations: string[] = [];

  if (s.overdueCount > 0) {
    insights.push({
      category: "Financeiro",
      severity: "danger",
      title: `${s.overdueCount} pagamento(s) vencido(s)`,
      body: `Você tem R$ ${s.overdueValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} em aberto e vencido. Regularizar evita juros e bloqueio de novas aprovações.`,
      link: "/portal/financeiro",
    });
    recommendations.push("Regularize os recebíveis vencidos no Financeiro para manter o contrato em dia.");
  }
  if (s.pend.divergentReports.length > 0) {
    insights.push({
      category: "Royalties",
      severity: "warn",
      title: `${s.pend.divergentReports.length} reporte(s) com divergência`,
      body: `Há reportes marcados para correção pelas validações automáticas. Revise-os para entrarem na fila de faturamento.`,
      link: "/portal/royalties",
    });
    recommendations.push("Corrija os reportes com divergência para não atrasar o faturamento dos royalties.");
  }
  if (s.pend.reprovedProducts.length > 0) {
    insights.push({
      category: "Produtos",
      severity: "danger",
      title: `${s.pend.reprovedProducts.length} produto(s) reprovado(s)`,
      body: `Reenvie uma nova versão ajustando os pontos apontados pelas alçadas para retomar a aprovação.`,
      link: "/portal/produtos",
    });
    recommendations.push("Reenvie os produtos reprovados com os ajustes solicitados pelas alçadas.");
  }
  if (s.expiringContractsCount > 0) {
    insights.push({
      category: "Contratos",
      severity: "warn",
      title: `${s.expiringContractsCount} contrato(s) a vencer em 60 dias`,
      body: `Antecipe a conversa de renovação com seu gestor de licenciamento para não interromper as vendas.`,
      link: "/portal/contratos",
    });
    recommendations.push("Inicie a renovação dos contratos que vencem nos próximos 60 dias.");
  }
  if (s.pendingProducts > 0) {
    insights.push({
      category: "Produtos",
      severity: "info",
      title: `${s.pendingProducts} produto(s) em aprovação`,
      body: `Acompanhe o andamento das 8 alçadas. Responder rápido a pedidos de ajuste acelera a liberação.`,
      link: "/portal/produtos",
    });
  }
  if (s.royaltyPrevious > 0) {
    const up = s.royaltyTrendPct >= 0;
    insights.push({
      category: "Royalties",
      severity: up ? "success" : "warn",
      title: `Royalties ${up ? "subiram" : "caíram"} ${Math.abs(s.royaltyTrendPct).toFixed(1)}% na última competência`,
      body: `Apuração atual: R$ ${s.royaltyCurrent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (anterior: R$ ${s.royaltyPrevious.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).`,
      link: "/portal/controladoria",
    });
  }

  if (insights.length === 0) {
    insights.push({
      category: "Tudo em dia",
      severity: "success",
      title: "Nenhum ponto de atenção no momento",
      body: "Seus reportes, produtos e pagamentos estão em dia. Continue enviando os reportes a cada competência.",
    });
  }
  if (recommendations.length === 0) {
    recommendations.push("Envie o reporte da competência atual assim que fechar as vendas do mês.");
  }

  const summary =
    insights.some((i) => i.severity === "danger")
      ? "Há itens que pedem sua ação imediata (financeiro ou produtos). Priorize os cartões em vermelho abaixo."
      : insights.some((i) => i.severity === "warn")
        ? "Há alguns pontos de atenção para revisar, mas nada crítico. Veja as recomendações abaixo."
        : "Sua operação de licenciamento está saudável. Continue acompanhando por aqui.";

  return { summary, insights, recommendations };
}

/* ------------------------------------------------------------------ *
 * Segurança da conta (dados da própria conta do licenciado)
 * ------------------------------------------------------------------ */

export async function portalAccountSecurity(tenantId: string, userId: string) {
  const rows = await rawRows<Record<string, string>>(sql`
    select name, email::text as email, mfa_enabled,
           last_login_at::text as last_login_at, password_updated_at::text as password_updated_at,
           created_at::text as created_at, status::text as status
    from app_user where id=${userId} and tenant_id=${tenantId} limit 1
  `);
  const u = rows[0];
  if (!u) return null;
  return {
    name: String(u.name),
    email: String(u.email),
    mfaEnabled: String(u.mfa_enabled) === "true",
    lastLoginAt: u.last_login_at ? String(u.last_login_at) : null,
    passwordUpdatedAt: u.password_updated_at ? String(u.password_updated_at) : null,
    createdAt: u.created_at ? String(u.created_at) : null,
    status: String(u.status),
  };
}
