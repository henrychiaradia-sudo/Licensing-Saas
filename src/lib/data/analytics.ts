import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  receivable,
  royaltyReport,
  purchaseOrder,
  invoice,
  licensingOpportunity,
  qualityInspection,
  nonConformity,
  contract,
  licensee,
} from "@/lib/db/schema";
import type { OpportunityStage, SupplierRiskLevel } from "@/lib/db/schema";
import { listLatestEvaluations } from "@/lib/data/evaluations";

/* ------------------------------------------------------------------ *
 * Helpers de eixo mensal
 * ------------------------------------------------------------------ */
const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

type YmRow = { ym: string | null; value: number };

function addMonths(y: number, m: number, delta: number) {
  const idx = y * 12 + (m - 1) + delta;
  return { y: Math.floor(idx / 12), m: (idx % 12) + 1 };
}

function buildAxis(rows: YmRow[], count = 12) {
  const yms = rows.map((r) => r.ym).filter((v): v is string => !!v).sort();
  let endY: number;
  let endM: number;
  if (yms.length) {
    const [y, m] = yms[yms.length - 1].split("-").map(Number);
    endY = y;
    endM = m;
  } else {
    const now = new Date();
    endY = now.getUTCFullYear();
    endM = now.getUTCMonth() + 1;
  }
  const axis: { ym: string; label: string }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const { y, m } = addMonths(endY, endM, -i);
    axis.push({ ym: `${y}-${String(m).padStart(2, "0")}`, label: `${MONTHS_PT[m - 1]}/${String(y).slice(2)}` });
  }
  return axis;
}

function mapSeries(rows: YmRow[], axis: { ym: string }[]) {
  const map = new Map(rows.filter((r) => r.ym).map((r) => [r.ym as string, r.value]));
  return axis.map((a) => map.get(a.ym) ?? 0);
}

/** Delta de tendência: soma dos últimos 3 meses vs 3 meses anteriores. */
export function trendDelta(series: number[]): { label: string; positive: boolean } | null {
  if (series.length < 6) return null;
  const recent = series.slice(-3).reduce((a, b) => a + b, 0);
  const prior = series.slice(-6, -3).reduce((a, b) => a + b, 0);
  if (prior <= 0) return recent > 0 ? { label: "novo", positive: true } : null;
  const pct = Math.round(((recent - prior) / prior) * 100);
  if (pct === 0) return null;
  return { label: `${Math.abs(pct)}%`, positive: pct > 0 };
}

/* ------------------------------------------------------------------ *
 * Linha do tempo financeira (12 meses): receita, royalties, compras
 * ------------------------------------------------------------------ */
export async function financialTimeline(tenantId: string) {
  const [rec, roy, com] = await Promise.all([
    db
      .select({
        ym: sql<string>`to_char(date_trunc('month', ${receivable.dueDate}), 'YYYY-MM')`,
        value: sql<string>`coalesce(sum(${receivable.amount}), 0)`,
      })
      .from(receivable)
      .where(and(eq(receivable.tenantId, tenantId), sql`${receivable.status} <> 'cancelado'`))
      .groupBy(sql`date_trunc('month', ${receivable.dueDate})`),
    db
      .select({
        ym: sql<string>`to_char(date_trunc('month', ${royaltyReport.periodStart}), 'YYYY-MM')`,
        value: sql<string>`coalesce(sum(${royaltyReport.royaltyCalculated}), 0)`,
      })
      .from(royaltyReport)
      .where(eq(royaltyReport.tenantId, tenantId))
      .groupBy(sql`date_trunc('month', ${royaltyReport.periodStart})`),
    db
      .select({
        ym: sql<string>`to_char(date_trunc('month', ${purchaseOrder.orderDate}), 'YYYY-MM')`,
        value: sql<string>`coalesce(sum(${purchaseOrder.totalAmount}), 0)`,
      })
      .from(purchaseOrder)
      .where(
        and(
          eq(purchaseOrder.tenantId, tenantId),
          sql`${purchaseOrder.status} <> 'cancelado'`,
          sql`${purchaseOrder.orderDate} is not null`,
        ),
      )
      .groupBy(sql`date_trunc('month', ${purchaseOrder.orderDate})`),
  ]);

  const num = (rows: { ym: string; value: string }[]): YmRow[] =>
    rows.map((r) => ({ ym: r.ym, value: Number(r.value) }));
  const recN = num(rec);
  const royN = num(roy);
  const comN = num(com);
  const axis = buildAxis([...recN, ...royN, ...comN], 12);

  return {
    labels: axis.map((a) => a.label),
    receita: mapSeries(recN, axis),
    royalties: mapSeries(royN, axis),
    compras: mapSeries(comN, axis),
  };
}

/* ------------------------------------------------------------------ *
 * Totais executivos (cartões KPI)
 * ------------------------------------------------------------------ */
export async function execTotals(tenantId: string) {
  const [inv, roy, po, opp] = await Promise.all([
    db
      .select({ v: sql<string>`coalesce(sum(${invoice.netAmount}) filter (where ${invoice.status} <> 'cancelada'), 0)` })
      .from(invoice)
      .where(eq(invoice.tenantId, tenantId)),
    db
      .select({ v: sql<string>`coalesce(sum(${royaltyReport.royaltyCalculated}), 0)` })
      .from(royaltyReport)
      .where(eq(royaltyReport.tenantId, tenantId)),
    db
      .select({ v: sql<string>`coalesce(sum(${purchaseOrder.totalAmount}) filter (where ${purchaseOrder.status} <> 'cancelado'), 0)` })
      .from(purchaseOrder)
      .where(eq(purchaseOrder.tenantId, tenantId)),
    db
      .select({
        weighted: sql<string>`coalesce(sum(${licensingOpportunity.estimatedValue} * ${licensingOpportunity.probability} / 100.0) filter (where ${licensingOpportunity.stage} not in ('ganho','perdido')), 0)`,
        openCount: sql<string>`count(*) filter (where ${licensingOpportunity.stage} not in ('ganho','perdido'))`,
      })
      .from(licensingOpportunity)
      .where(eq(licensingOpportunity.tenantId, tenantId)),
  ]);
  return {
    faturamento: Number(inv[0]?.v ?? 0),
    royalties: Number(roy[0]?.v ?? 0),
    compras: Number(po[0]?.v ?? 0),
    pipelineWeighted: Number(opp[0]?.weighted ?? 0),
    pipelineOpen: Number(opp[0]?.openCount ?? 0),
  };
}

/* ------------------------------------------------------------------ *
 * Pipeline comercial por estágio
 * ------------------------------------------------------------------ */
const STAGE_LABEL: Record<OpportunityStage, string> = {
  prospeccao: "Prospecção",
  qualificacao: "Qualificação",
  proposta: "Proposta",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};
const STAGE_ORDER: OpportunityStage[] = [
  "prospeccao",
  "qualificacao",
  "proposta",
  "negociacao",
  "ganho",
  "perdido",
];

export async function pipelineByStage(tenantId: string) {
  const rows = await db
    .select({
      stage: licensingOpportunity.stage,
      count: sql<string>`count(*)`,
      value: sql<string>`coalesce(sum(${licensingOpportunity.estimatedValue}), 0)`,
    })
    .from(licensingOpportunity)
    .where(eq(licensingOpportunity.tenantId, tenantId))
    .groupBy(licensingOpportunity.stage);

  const map = new Map(rows.map((r) => [r.stage, { count: Number(r.count), value: Number(r.value) }]));
  return STAGE_ORDER.map((s) => ({
    stage: s,
    label: STAGE_LABEL[s],
    count: map.get(s)?.count ?? 0,
    value: map.get(s)?.value ?? 0,
  }));
}

/* ------------------------------------------------------------------ *
 * Qualidade & não conformidades
 * ------------------------------------------------------------------ */
export async function qualityBreakdown(tenantId: string) {
  const [insp, ncStatusRows, ncSevRows] = await Promise.all([
    db
      .select({ result: qualityInspection.result, count: sql<string>`count(*)` })
      .from(qualityInspection)
      .where(eq(qualityInspection.tenantId, tenantId))
      .groupBy(qualityInspection.result),
    db
      .select({ status: nonConformity.status, count: sql<string>`count(*)` })
      .from(nonConformity)
      .where(eq(nonConformity.tenantId, tenantId))
      .groupBy(nonConformity.status),
    db
      .select({ severity: nonConformity.severity, count: sql<string>`count(*)` })
      .from(nonConformity)
      .where(eq(nonConformity.tenantId, tenantId))
      .groupBy(nonConformity.severity),
  ]);

  const resultLabel: Record<string, { label: string; color: string }> = {
    aprovado: { label: "Aprovado", color: "#34d399" },
    aprovado_condicional: { label: "Aprov. condicional", color: "#fbbf24" },
    reprovado: { label: "Reprovado", color: "#f87171" },
    pendente: { label: "Pendente", color: "#94a3b8" },
  };
  const sevLabel: Record<string, { label: string; color: string }> = {
    baixa: { label: "Baixa", color: "#34d399" },
    media: { label: "Média", color: "#fbbf24" },
    alta: { label: "Alta", color: "#fb923c" },
    critica: { label: "Crítica", color: "#f87171" },
  };

  const inspections = insp.map((r) => ({
    label: resultLabel[r.result]?.label ?? r.result,
    value: Number(r.count),
    color: resultLabel[r.result]?.color,
  }));
  const ncBySeverity = ncSevRows.map((r) => ({
    label: sevLabel[r.severity]?.label ?? r.severity,
    value: Number(r.count),
    color: sevLabel[r.severity]?.color,
  }));
  const openNc = ncStatusRows
    .filter((r) => r.status === "aberta" || r.status === "em_tratamento")
    .reduce((a, b) => a + Number(b.count), 0);
  const totalInspections = insp.reduce((a, b) => a + Number(b.count), 0);

  return { inspections, ncBySeverity, openNc, totalInspections };
}

/* ------------------------------------------------------------------ *
 * Mix de contratos por status
 * ------------------------------------------------------------------ */
const CONTRACT_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  em_aprovacao: "Em aprovação",
  vigente: "Vigente",
  suspenso: "Suspenso",
  renovado: "Renovado",
  expirado: "Expirado",
  encerrado: "Encerrado",
};

export async function contractStatusMix(tenantId: string) {
  const rows = await db
    .select({ status: contract.status, count: sql<string>`count(*)` })
    .from(contract)
    .where(and(eq(contract.tenantId, tenantId), isNull(contract.deletedAt)))
    .groupBy(contract.status);
  return rows
    .map((r) => ({ label: CONTRACT_STATUS_LABEL[r.status] ?? r.status, value: Number(r.count) }))
    .sort((a, b) => b.value - a.value);
}

/* ------------------------------------------------------------------ *
 * Risco de fornecedores (última avaliação)
 * ------------------------------------------------------------------ */
export async function supplierRiskMix(tenantId: string) {
  const evals = await listLatestEvaluations(tenantId);
  const order: SupplierRiskLevel[] = ["baixo", "medio", "alto", "critico"];
  const label: Record<SupplierRiskLevel, string> = {
    baixo: "Baixo",
    medio: "Médio",
    alto: "Alto",
    critico: "Crítico",
  };
  const color: Record<SupplierRiskLevel, string> = {
    baixo: "#34d399",
    medio: "#fbbf24",
    alto: "#fb923c",
    critico: "#f87171",
  };
  const items = order
    .map((r) => ({
      label: label[r],
      value: evals.filter((e) => e.riskLevel === r).length,
      color: color[r],
    }))
    .filter((s) => s.value > 0);
  const avgScore =
    evals.length > 0 ? Math.round(evals.reduce((a, b) => a + (b.overallScore ?? 0), 0) / evals.length) : 0;
  return { items, avgScore, evaluated: evals.length };
}

/* ------------------------------------------------------------------ *
 * Aging de recebíveis em aberto
 * ------------------------------------------------------------------ */
export async function receivablesAging(tenantId: string) {
  const rows = await db
    .select({
      bucket: sql<string>`case
        when ${receivable.dueDate} < current_date then 'vencido'
        when ${receivable.dueDate} <= current_date + 30 then 'd30'
        when ${receivable.dueDate} <= current_date + 60 then 'd60'
        else 'd60plus' end`,
      value: sql<string>`coalesce(sum(${receivable.amount} - ${receivable.paidAmount}), 0)`,
    })
    .from(receivable)
    .where(and(eq(receivable.tenantId, tenantId), sql`${receivable.status} not in ('pago','cancelado')`))
    .groupBy(sql`1`);
  const label: Record<string, { label: string; color: string }> = {
    vencido: { label: "Vencido", color: "#f87171" },
    d30: { label: "Até 30 dias", color: "#fbbf24" },
    d60: { label: "31–60 dias", color: "#38bdf8" },
    d60plus: { label: "60+ dias", color: "#818cf8" },
  };
  const order = ["vencido", "d30", "d60", "d60plus"];
  const map = new Map(rows.map((r) => [r.bucket, Number(r.value)]));
  return order
    .map((k) => ({ label: label[k].label, value: map.get(k) ?? 0, color: label[k].color }))
    .filter((s) => s.value > 0);
}

/* ------------------------------------------------------------------ *
 * Scatter: vendas brutas × royalties por licenciado
 * ------------------------------------------------------------------ */
/** Uma bolha por reporte de royalties: x = vendas brutas, y = royalty apurado. */
export async function salesRoyaltyScatter(tenantId: string) {
  const rows = await db
    .select({
      licenseeName: licensee.legalName,
      reference: royaltyReport.referenceLabel,
      gross: royaltyReport.grossSalesTotal,
      royalty: royaltyReport.royaltyCalculated,
    })
    .from(royaltyReport)
    .leftJoin(licensee, eq(licensee.id, royaltyReport.licenseeId))
    .where(eq(royaltyReport.tenantId, tenantId));
  return rows
    .map((r) => ({
      label: `${r.licenseeName ?? "—"} · ${r.reference}`,
      x: Number(r.gross),
      y: Number(r.royalty),
      reports: 1,
    }))
    .filter((p) => p.x > 0 || p.y > 0);
}

/* ------------------------------------------------------------------ *
 * Royalties por status
 * ------------------------------------------------------------------ */
const ROYALTY_STATUS_LABEL: Record<string, { label: string; color: string }> = {
  rascunho: { label: "Rascunho", color: "#94a3b8" },
  enviado: { label: "Enviado", color: "#38bdf8" },
  em_validacao: { label: "Em validação", color: "#818cf8" },
  com_divergencia: { label: "Com divergência", color: "#fb923c" },
  aprovado: { label: "Aprovado", color: "#34d399" },
  rejeitado: { label: "Rejeitado", color: "#f87171" },
};

export async function royaltyStatusMix(tenantId: string) {
  const rows = await db
    .select({ status: royaltyReport.status, count: sql<string>`count(*)` })
    .from(royaltyReport)
    .where(eq(royaltyReport.tenantId, tenantId))
    .groupBy(royaltyReport.status);
  return rows.map((r) => ({
    label: ROYALTY_STATUS_LABEL[r.status]?.label ?? r.status,
    value: Number(r.count),
    color: ROYALTY_STATUS_LABEL[r.status]?.color,
  }));
}
