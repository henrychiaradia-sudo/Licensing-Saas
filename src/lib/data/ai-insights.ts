import "server-only";
import { fxExposure } from "./fx";
import { budgetKpis, listBudgets, CURRENT_FISCAL_YEAR } from "./purchase-budget";
import { purchaseContractSummary, listPurchaseContracts } from "./purchase-contracts";
import { listPendingApprovals } from "./approvals";
import { sourcingSavings } from "./sourcing";
import { financeSummary } from "./finance";
import { qualitySummary } from "./quality";
import { legalSummary } from "./legal";
import { taskSummary } from "./tasks";
import { pipelineSummary } from "./opportunities";
import { marketingSummary } from "./marketing";
import { supplyContractSummary, listSupplyContracts } from "./supply-contracts";
import { purchaseSummary, purchaseSpendAnalysis } from "./purchase-orders";

/* ---------------------------------------------------------------------------
 * Utilidades
 * ------------------------------------------------------------------------- */
const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const brlx = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr.length === 10 ? dateStr + "T00:00:00" : dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.ceil((d.getTime() - now.getTime()) / 86400000);
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/* ---------------------------------------------------------------------------
 * Insights (anomalias e riscos, por severidade)
 * ------------------------------------------------------------------------- */
export type Severity = "critica" | "atencao" | "info" | "positivo";
export type Insight = {
  id: string;
  severity: Severity;
  category: string;
  title: string;
  description: string;
  href: string | null;
  action: string | null;
};

const SEV_ORDER: Record<Severity, number> = { critica: 0, atencao: 1, info: 2, positivo: 3 };

export async function generateInsights(tenantId: string): Promise<Insight[]> {
  const year = CURRENT_FISCAL_YEAR;
  const [fx, budgets, bKpis, pcs, pcSummary, pending, savings, fin, qual, legal, tasks, supply] =
    await Promise.all([
      fxExposure(tenantId),
      listBudgets(tenantId, year),
      budgetKpis(tenantId, year),
      listPurchaseContracts(tenantId),
      purchaseContractSummary(tenantId),
      listPendingApprovals(tenantId),
      sourcingSavings(tenantId),
      financeSummary(tenantId),
      qualitySummary(tenantId),
      legalSummary(tenantId),
      taskSummary(tenantId),
      supplyContractSummary(tenantId),
    ]);

  const out: Insight[] = [];
  const push = (i: Insight) => out.push(i);

  // Câmbio
  if (fx.totals.netBase > 0 && fx.totals.coveragePct < 60) {
    push({
      id: "fx-coverage",
      severity: fx.totals.coveragePct < 30 ? "critica" : "atencao",
      category: "Câmbio",
      title: `Exposição cambial pouco protegida (${fx.totals.coveragePct}% coberto)`,
      description: `${brl(fx.totals.netBase)} de exposição líquida sem hedge em ${fx.totals.currencyCount} moeda(s).`,
      href: "/cambio",
      action: "Contratar hedge",
    });
  }
  for (const r of fx.rows) {
    if (r.coveragePct < 25 && r.exposureBase > 500000) {
      push({
        id: `fx-${r.isoCode}`,
        severity: "atencao",
        category: "Câmbio",
        title: `${r.isoCode}: ${r.coveragePct}% de cobertura`,
        description: `${brl(r.exposureBase)} de exposição em ${r.isoCode}, com ${brl(r.netBase)} sem proteção.`,
        href: "/cambio",
        action: "Avaliar NDF",
      });
    }
  }

  // Orçamento
  if (bKpis.overCount > 0) {
    const over = budgets.filter((b) => b.over).slice(0, 3).map((b) => b.name).join(", ");
    push({
      id: "budget-over",
      severity: "critica",
      category: "Orçamento",
      title: `${bKpis.overCount} categoria(s) acima do orçamento`,
      description: `Estouro em: ${over}. Consumo total de ${bKpis.utilizationPct}% do orçado.`,
      href: "/budget",
      action: "Revisar orçamento",
    });
  }
  for (const b of budgets) {
    if (!b.over && b.budget > 0 && b.utilizationPct >= 85 && b.utilizationPct <= 100) {
      push({
        id: `budget-${b.categoryId}`,
        severity: "atencao",
        category: "Orçamento",
        title: `${b.name} em ${b.utilizationPct}% do orçamento`,
        description: `Restam ${brl(b.available)} de saldo orçamentário nesta categoria.`,
        href: "/budget",
        action: null,
      });
    }
  }

  // Contratos de compra
  for (const c of pcs) {
    if (c.status === "vigente" && c.committed > 0 && c.utilizationPct >= 85) {
      push({
        id: `pc-saldo-${c.id}`,
        severity: "atencao",
        category: "Contratos",
        title: `Saldo baixo no contrato ${c.contractNumber}`,
        description: `${c.utilizationPct}% do valor comprometido já consumido — restam ${brl(c.available)}.`,
        href: `/contratos-compra/${c.id}`,
        action: "Ampliar contrato",
      });
    }
    const d = daysUntil(c.endDate as unknown as string | null);
    if (c.status === "vigente" && d !== null && d >= 0 && d <= 60) {
      push({
        id: `pc-venc-${c.id}`,
        severity: "info",
        category: "Contratos",
        title: `Contrato ${c.contractNumber} vence em ${d} dia(s)`,
        description: `${c.title} — ${c.supplierName ?? ""}.`,
        href: `/contratos-compra/${c.id}`,
        action: "Renovar",
      });
    }
  }
  if (supply.expiring > 0) {
    push({
      id: "supply-expiring",
      severity: "atencao",
      category: "Contratos",
      title: `${supply.expiring} contrato(s) de fornecimento vencendo em 90 dias`,
      description: `Reveja renovações para não interromper o fornecimento.`,
      href: "/contratos-fornecimento",
      action: "Revisar renovações",
    });
  }

  // Aprovações
  const bigPending = pending.filter((p) => p.estimatedTotal >= 200000);
  for (const p of bigPending.slice(0, 3)) {
    push({
      id: `appr-${p.reqId}`,
      severity: "atencao",
      category: "Aprovações",
      title: `Aprovação de alto valor parada: ${p.requisitionNumber}`,
      description: `${brl(p.estimatedTotal)} aguardando ${p.currentTier} (nível ${p.currentSeq} de ${p.totalSteps}).`,
      href: "/aprovacoes",
      action: "Aprovar",
    });
  }
  if (pending.length > 0 && bigPending.length === 0) {
    push({
      id: "appr-count",
      severity: "info",
      category: "Aprovações",
      title: `${pending.length} requisição(ões) aguardando aprovação`,
      description: `Total de ${brl(pending.reduce((s, p) => s + p.estimatedTotal, 0))} na fila de alçadas.`,
      href: "/aprovacoes",
      action: "Ver fila",
    });
  }

  // Financeiro
  if (fin.overdue > 0) {
    push({
      id: "fin-overdue",
      severity: "critica",
      category: "Financeiro",
      title: `${brl(fin.overdue)} em recebíveis vencidos`,
      description: `Cobrança pendente de licenciados. Em aberto total: ${brl(fin.outstanding)}.`,
      href: "/financeiro",
      action: "Cobrar",
    });
  }

  // Qualidade
  if (qual.criticalNc > 0) {
    push({
      id: "qual-nc",
      severity: "critica",
      category: "Qualidade",
      title: `${qual.criticalNc} não conformidade(s) crítica(s) aberta(s)`,
      description: `${qual.openNc} NCs abertas no total. Taxa de aprovação em inspeções: ${qual.approvalRate}%.`,
      href: "/qualidade",
      action: "Tratar NC",
    });
  }

  // Jurídico
  if (legal.critical > 0) {
    push({
      id: "legal-crit",
      severity: "atencao",
      category: "Jurídico",
      title: `${legal.critical} caso(s) jurídico(s) crítico(s)`,
      description: `${brl(Number(legal.atRisk))} em risco em ${legal.open} casos abertos.`,
      href: "/juridico",
      action: "Revisar",
    });
  }

  // Tarefas
  if (tasks.overdue > 0) {
    push({
      id: "tasks-overdue",
      severity: "atencao",
      category: "Operação",
      title: `${tasks.overdue} tarefa(s) atrasada(s)`,
      description: `De um total de ${tasks.total} tarefas (${tasks.done} concluídas).`,
      href: "/tarefas",
      action: "Priorizar",
    });
  }

  // Positivos
  if (savings.totalSavings > 0) {
    push({
      id: "sourcing-savings",
      severity: "positivo",
      category: "Sourcing",
      title: `${brl(savings.totalSavings)} de savings em sourcing`,
      description: `${savings.avgPct}% de economia sobre ${brl(savings.totalBaseline)} de baseline negociado.`,
      href: "/sourcing",
      action: null,
    });
  }
  if (pcSummary.available > 0) {
    push({
      id: "pc-available",
      severity: "positivo",
      category: "Contratos",
      title: `${brl(pcSummary.available)} de saldo disponível em contratos`,
      description: `${pcSummary.active} contratos de compra vigentes, ${pcSummary.utilizationPct}% consumidos.`,
      href: "/contratos-compra",
      action: null,
    });
  }

  out.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);
  return out;
}

/* ---------------------------------------------------------------------------
 * Recomendações acionáveis
 * ------------------------------------------------------------------------- */
export type Recommendation = {
  id: string;
  title: string;
  detail: string;
  href: string | null;
};

export async function generateRecommendations(tenantId: string): Promise<Recommendation[]> {
  const [fx, budgets, pcs, pending, spend] = await Promise.all([
    fxExposure(tenantId),
    listBudgets(tenantId, CURRENT_FISCAL_YEAR),
    listPurchaseContracts(tenantId),
    listPendingApprovals(tenantId),
    purchaseSpendAnalysis(tenantId),
  ]);
  const recs: Recommendation[] = [];

  // Hedge da maior exposição líquida
  const topFx = [...fx.rows].sort((a, b) => b.netBase - a.netBase)[0];
  if (topFx && topFx.netBase > 0) {
    recs.push({
      id: "rec-hedge",
      title: `Proteger exposição em ${topFx.isoCode}`,
      detail: `Contrate um NDF de aproximadamente ${topFx.unhedgedNative.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} ${topFx.isoCode} (${brl(topFx.netBase)}) para eliminar a exposição não coberta.`,
      href: "/cambio",
    });
  }

  // Realocação de orçamento
  const over = budgets.find((b) => b.over);
  const under = [...budgets]
    .filter((b) => b.budget > 0 && b.utilizationPct < 40)
    .sort((a, b) => b.available - a.available)[0];
  if (over && under) {
    recs.push({
      id: "rec-budget",
      title: `Realocar orçamento para ${over.name}`,
      detail: `${over.name} estourou o orçamento; ${under.name} usou só ${under.utilizationPct}% (saldo ${brl(under.available)}). Considere remanejar verba.`,
      href: "/budget",
    });
  }

  // Priorizar aprovação de maior valor
  const topPending = [...pending].sort((a, b) => b.estimatedTotal - a.estimatedTotal)[0];
  if (topPending) {
    recs.push({
      id: "rec-approval",
      title: `Priorizar aprovação de ${topPending.requisitionNumber}`,
      detail: `${brl(topPending.estimatedTotal)} aguardando ${topPending.currentTier}. É a maior requisição parada na fila.`,
      href: "/aprovacoes",
    });
  }

  // Contrato com saldo mais apertado
  const tightest = [...pcs]
    .filter((c) => c.status === "vigente" && c.committed > 0)
    .sort((a, b) => b.utilizationPct - a.utilizationPct)[0];
  if (tightest && tightest.utilizationPct >= 70) {
    recs.push({
      id: "rec-contract",
      title: `Renegociar o contrato ${tightest.contractNumber}`,
      detail: `Já consumiu ${tightest.utilizationPct}% do valor comprometido (restam ${brl(tightest.available)}). Antecipe a renovação/ampliação com ${tightest.supplierName ?? "o fornecedor"}.`,
      href: `/contratos-compra/${tightest.id}`,
    });
  }

  // Concentração de fornecedor
  const topSupplier = spend.bySupplier[0];
  if (topSupplier && topSupplier.total > 0) {
    recs.push({
      id: "rec-supplier",
      title: `Negociar volume com ${topSupplier.name}`,
      detail: `${brl(topSupplier.total)} em ${topSupplier.orders} pedidos — seu maior fornecedor por gasto. Bom candidato a acordo de volume/desconto.`,
      href: "/fornecedores",
    });
  }

  return recs.slice(0, 6);
}

/* ---------------------------------------------------------------------------
 * Resumo executivo (narrativa a partir dos KPIs)
 * ------------------------------------------------------------------------- */
export async function executiveSummary(tenantId: string): Promise<{
  text: string[];
  metrics: { label: string; value: string; href: string }[];
}> {
  const [pipeline, fin, purch, bKpis, fx, mkt, savings, supply, pcSummary] = await Promise.all([
    pipelineSummary(tenantId),
    financeSummary(tenantId),
    purchaseSummary(tenantId),
    budgetKpis(tenantId, CURRENT_FISCAL_YEAR),
    fxExposure(tenantId),
    marketingSummary(tenantId),
    sourcingSavings(tenantId),
    supplyContractSummary(tenantId),
    purchaseContractSummary(tenantId),
  ]);

  const text: string[] = [];
  text.push(
    `A operação tem ${pipeline.openCount} oportunidade(s) de licenciamento em aberto no pipeline (${brl(Number(pipeline.openValue))}, ${brl(Number(pipeline.weighted))} ponderado) e ${brl(fin.outstanding)} a receber${fin.overdue > 0 ? `, dos quais ${brl(fin.overdue)} estão vencidos` : ""}.`,
  );
  text.push(
    `Em suprimentos, ${brl(purch.open)} em pedidos em aberto e ${brl(purch.received)} já recebidos; o orçamento anual está ${bKpis.utilizationPct}% consumido (${brl(bKpis.totalAvailable)} disponíveis)${bKpis.overCount > 0 ? `, com ${bKpis.overCount} categoria(s) estourada(s)` : ""}. Contratos de compra somam ${brl(pcSummary.committed)} comprometidos, ${pcSummary.utilizationPct}% consumidos.`,
  );
  text.push(
    `A exposição cambial líquida é de ${brl(fx.totals.netBase)} (${fx.totals.coveragePct}% coberta por hedge). Sourcing gerou ${brl(savings.totalSavings)} de savings (${savings.avgPct}%). Marketing está com ROI de ${Math.round(mkt.roi ?? 0)}% sobre ${brl(mkt.spent)} investidos.`,
  );

  const metrics = [
    { label: "A receber", value: brlx(fin.outstanding), href: "/financeiro" },
    { label: "Pedidos em aberto", value: brlx(purch.open), href: "/compras" },
    { label: "Orçamento consumido", value: `${bKpis.utilizationPct}%`, href: "/budget" },
    { label: "Exposição líquida", value: brlx(fx.totals.netBase), href: "/cambio" },
    { label: "Savings de sourcing", value: brlx(savings.totalSavings), href: "/sourcing" },
    { label: "Contratos ativos", value: String(supply.active + pcSummary.active), href: "/contratos-compra" },
  ];

  return { text, metrics };
}

/* ---------------------------------------------------------------------------
 * Busca inteligente (intenções sobre os dados)
 * ------------------------------------------------------------------------- */
export type SearchResult = {
  matched: boolean;
  intent: string;
  title: string;
  rows: { label: string; value: string; href?: string }[];
  note?: string;
};

const EXAMPLES = [
  "contratos vencendo",
  "orçamento estourado",
  "exposição em dólar",
  "aprovações pendentes",
  "recebíveis vencidos",
  "savings de sourcing",
  "maiores fornecedores",
];

export async function smartSearch(tenantId: string, rawQuery: string): Promise<SearchResult> {
  const q = norm(rawQuery);
  const has = (...terms: string[]) => terms.some((t) => q.includes(t));

  // Câmbio / exposição
  if (has("cambio", "cambial", "exposic", "hedge", "dolar", "dólar", "euro", "moeda", "usd", "eur", "cny", "yuan", "iene", "peso")) {
    const fx = await fxExposure(tenantId);
    const rows = fx.rows.map((r) => ({
      label: `${r.isoCode} · ${r.coveragePct}% coberto`,
      value: `${brl(r.exposureBase)} exposto · ${brl(r.netBase)} líquido`,
      href: "/cambio",
    }));
    return {
      matched: rows.length > 0,
      intent: "câmbio",
      title: "Exposição cambial por moeda",
      rows: rows.length ? rows : [{ label: "Sem exposição", value: "Todos os pedidos abertos em BRL" }],
      note: `Exposição líquida total: ${brl(fx.totals.netBase)} · cobertura ${fx.totals.coveragePct}%.`,
    };
  }

  // Contratos vencendo
  if (has("venc", "expir", "renov") && has("contrato")) {
    const [pcs, supplies] = await Promise.all([
      listPurchaseContracts(tenantId),
      listSupplyContracts(tenantId),
    ]);
    const rows: SearchResult["rows"] = [];
    for (const c of pcs) {
      const d = daysUntil(c.endDate as unknown as string | null);
      if (d !== null && d >= 0 && d <= 120)
        rows.push({ label: `${c.contractNumber} · ${c.supplierName ?? ""}`, value: `vence em ${d} dias`, href: `/contratos-compra/${c.id}` });
    }
    for (const c of supplies) {
      const d = daysUntil(c.endDate as unknown as string | null);
      if (d !== null && d >= 0 && d <= 120)
        rows.push({ label: `${c.contractNumber} · ${c.supplierName ?? ""}`, value: `vence em ${d} dias`, href: `/contratos-fornecimento/${c.id}` });
    }
    // Ordena por urgência (menor prazo primeiro). O prazo está no texto
    // "vence em N dias" — extrai os dígitos (parseInt do texto retornaria NaN).
    const daysOf = (v: string) => Number(v.replace(/\D/g, "")) || 0;
    rows.sort((a, b) => daysOf(a.value) - daysOf(b.value));
    return {
      matched: true,
      intent: "contratos vencendo",
      title: "Contratos vencendo em até 120 dias",
      rows: rows.length ? rows : [{ label: "Nenhum contrato vencendo", value: "no horizonte de 120 dias" }],
    };
  }

  // Orçamento
  if (has("orcament", "budget", "estour", "verba")) {
    const budgets = await listBudgets(tenantId, CURRENT_FISCAL_YEAR);
    const flagged = budgets.filter((b) => b.over || (b.budget > 0 && b.utilizationPct >= 80));
    return {
      matched: true,
      intent: "orçamento",
      title: "Categorias no limite ou acima do orçamento",
      rows: flagged.length
        ? flagged.map((b) => ({
            label: `${b.name} · ${b.utilizationPct}%${b.over ? " (estourou)" : ""}`,
            value: `${brl(b.consumed)} de ${brl(b.budget)}`,
            href: "/budget",
          }))
        : [{ label: "Tudo sob controle", value: "nenhuma categoria acima de 80%" }],
    };
  }

  // Aprovações
  if (has("aprova", "alcada", "alçada", "pendente", "requisic")) {
    const pending = await listPendingApprovals(tenantId);
    return {
      matched: true,
      intent: "aprovações",
      title: "Requisições aguardando aprovação",
      rows: pending.length
        ? pending.map((p) => ({
            label: `${p.requisitionNumber} · ${p.currentTier}`,
            value: brl(p.estimatedTotal),
            href: "/aprovacoes",
          }))
        : [{ label: "Fila vazia", value: "nenhuma aprovação pendente" }],
    };
  }

  // Financeiro / recebíveis
  if (has("receb", "vencid", "financ", "cobran", "inadimpl", "a receber")) {
    const fin = await financeSummary(tenantId);
    return {
      matched: true,
      intent: "financeiro",
      title: "Situação de recebíveis",
      rows: [
        { label: "Em aberto", value: brl(fin.outstanding), href: "/financeiro" },
        { label: "Vencidos", value: brl(fin.overdue), href: "/financeiro" },
        { label: "Já recebido", value: brl(fin.received), href: "/financeiro" },
      ],
    };
  }

  // Sourcing / savings
  if (has("saving", "econom", "sourcing", "cotac")) {
    const s = await sourcingSavings(tenantId);
    return {
      matched: true,
      intent: "sourcing",
      title: "Savings de sourcing",
      rows: s.events.slice(0, 8).map((e) => ({
        label: `${e.title} · ${e.supplierName ?? ""}`,
        value: `${brl(e.savings)} (${e.savingsPct}%)`,
        href: "/sourcing",
      })),
      note: `Total: ${brl(s.totalSavings)} (${s.avgPct}%) sobre ${brl(s.totalBaseline)} de baseline.`,
    };
  }

  // Fornecedores / gasto
  if (has("fornecedor", "gasto", "compra", "spend")) {
    const spend = await purchaseSpendAnalysis(tenantId);
    return {
      matched: true,
      intent: "fornecedores",
      title: "Maiores fornecedores por gasto",
      rows: spend.bySupplier.map((s) => ({
        label: `${s.name} · ${s.orders} pedido(s)`,
        value: brl(s.total),
        href: "/fornecedores",
      })),
    };
  }

  return {
    matched: false,
    intent: "desconhecido",
    title: "Não encontrei uma resposta direta",
    rows: EXAMPLES.map((e) => ({ label: e, value: "" })),
    note: "Tente uma destas perguntas:",
  };
}

export const SEARCH_EXAMPLES = EXAMPLES;
