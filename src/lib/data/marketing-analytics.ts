import "server-only";
import { and, eq, sql, gte, desc, asc, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { marketingAction, marketingCampaign, brand } from "@/lib/db/schema";
import { roiPct } from "@/lib/data/marketing";

export type Slice = { key: string; label: string; value: number };

const ACTION_TYPE_LABEL: Record<string, string> = {
  ativacao: "Ativação",
  evento: "Evento",
  influenciador: "Influenciador",
  patrocinio: "Patrocínio",
  conteudo: "Conteúdo",
  midia_paga: "Mídia paga",
  midia_espontanea: "Mídia espontânea",
  redes_sociais: "Redes sociais",
  promocao: "Promoção",
  producao: "Produção",
  pdv: "PDV",
  outro: "Outro",
};

/** Gasto por tática (tipo de ação). */
export async function spendByType(tenantId: string): Promise<Slice[]> {
  const rows = await db
    .select({
      key: marketingAction.actionType,
      value: sql<string>`coalesce(sum(${marketingAction.spent}), 0)`,
    })
    .from(marketingAction)
    .where(eq(marketingAction.tenantId, tenantId))
    .groupBy(marketingAction.actionType);
  return rows
    .map((r) => ({ key: r.key, label: ACTION_TYPE_LABEL[r.key] ?? r.key, value: Number(r.value) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
}

/** Gasto por canal (das ações). */
export async function spendByChannel(tenantId: string): Promise<Slice[]> {
  const rows = await db
    .select({
      key: sql<string>`coalesce(nullif(trim(${marketingAction.channel}), ''), 'Sem canal')`,
      value: sql<string>`coalesce(sum(${marketingAction.spent}), 0)`,
    })
    .from(marketingAction)
    .where(eq(marketingAction.tenantId, tenantId))
    .groupBy(sql`coalesce(nullif(trim(${marketingAction.channel}), ''), 'Sem canal')`);
  return rows
    .map((r) => ({ key: r.key, label: r.key, value: Number(r.value) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

/** Verba própria × cooperada (soma de gasto das ações). */
export async function coopVsOwn(tenantId: string): Promise<{ own: number; coop: number }> {
  const rows = await db
    .select({
      coop: marketingAction.coop,
      value: sql<string>`coalesce(sum(${marketingAction.spent}), 0)`,
    })
    .from(marketingAction)
    .where(eq(marketingAction.tenantId, tenantId))
    .groupBy(marketingAction.coop);
  let own = 0;
  let coop = 0;
  for (const r of rows) {
    if (r.coop) coop += Number(r.value);
    else own += Number(r.value);
  }
  return { own, coop };
}

/** Mídia paga × mídia espontânea: investimento (paga) e alcance conquistado (espontânea). */
export async function paidVsEarnedMedia(tenantId: string) {
  const rows = await db
    .select({
      key: marketingAction.actionType,
      spent: sql<string>`coalesce(sum(${marketingAction.spent}), 0)`,
      reach: sql<string>`coalesce(sum(${marketingAction.reachActual}), 0)`,
      count: sql<string>`count(*)`,
    })
    .from(marketingAction)
    .where(
      and(
        eq(marketingAction.tenantId, tenantId),
        sql`${marketingAction.actionType} in ('midia_paga','midia_espontanea','redes_sociais','conteudo')`,
      ),
    )
    .groupBy(marketingAction.actionType);
  const paidSpent = rows
    .filter((r) => r.key === "midia_paga")
    .reduce((s, r) => s + Number(r.spent), 0);
  const paidReach = rows
    .filter((r) => r.key === "midia_paga")
    .reduce((s, r) => s + Number(r.reach), 0);
  const earnedReach = rows
    .filter((r) => r.key === "midia_espontanea")
    .reduce((s, r) => s + Number(r.reach), 0);
  const socialReach = rows
    .filter((r) => r.key === "redes_sociais" || r.key === "conteudo")
    .reduce((s, r) => s + Number(r.reach), 0);
  return { paidSpent, paidReach, earnedReach, socialReach };
}

/** Orçado × realizado por campanha (top por orçamento). */
export async function budgetVsRealized(tenantId: string) {
  const rows = await db
    .select({
      id: marketingCampaign.id,
      name: marketingCampaign.name,
      budget: marketingCampaign.budget,
      spent: marketingCampaign.spent,
      brandName: brand.name,
    })
    .from(marketingCampaign)
    .leftJoin(brand, eq(brand.id, marketingCampaign.brandId))
    .where(eq(marketingCampaign.tenantId, tenantId))
    .orderBy(desc(marketingCampaign.budget))
    .limit(8);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    brandName: r.brandName,
    budget: Number(r.budget),
    spent: Number(r.spent),
  }));
}

/** ROI por campanha (apenas com gasto > 0), ordenado do melhor ao pior. */
export async function roiByCampaign(tenantId: string) {
  const rows = await db
    .select({
      id: marketingCampaign.id,
      name: marketingCampaign.name,
      spent: marketingCampaign.spent,
      revenue: marketingCampaign.revenue,
      brandName: brand.name,
    })
    .from(marketingCampaign)
    .leftJoin(brand, eq(brand.id, marketingCampaign.brandId))
    .where(and(eq(marketingCampaign.tenantId, tenantId), sql`${marketingCampaign.spent} > 0`))
    .limit(50);
  return rows
    .map((r) => {
      const spent = Number(r.spent);
      const revenue = Number(r.revenue);
      return {
        id: r.id,
        name: r.name,
        brandName: r.brandName,
        spent,
        revenue,
        roi: roiPct(spent, revenue),
      };
    })
    .sort((a, b) => (b.roi ?? -Infinity) - (a.roi ?? -Infinity));
}

/** Evolução mensal de gasto e receita (últimos meses com ações datadas). */
export async function monthlyTrend(tenantId: string) {
  const rows = await db
    .select({
      month: sql<string>`to_char(${marketingAction.startDate}, 'YYYY-MM')`,
      spent: sql<string>`coalesce(sum(${marketingAction.spent}), 0)`,
      revenue: sql<string>`coalesce(sum(${marketingAction.revenue}), 0)`,
    })
    .from(marketingAction)
    .where(and(eq(marketingAction.tenantId, tenantId), isNotNull(marketingAction.startDate)))
    .groupBy(sql`to_char(${marketingAction.startDate}, 'YYYY-MM')`)
    .orderBy(asc(sql`to_char(${marketingAction.startDate}, 'YYYY-MM')`));
  return rows.slice(-8).map((r) => ({
    month: r.month,
    spent: Number(r.spent),
    revenue: Number(r.revenue),
  }));
}

/** Ações futuras/agendadas para o calendário (a partir de uma data). */
export async function upcomingActions(tenantId: string, fromDate: string, limit = 40) {
  return db
    .select({
      id: marketingAction.id,
      name: marketingAction.name,
      actionType: marketingAction.actionType,
      status: marketingAction.status,
      startDate: marketingAction.startDate,
      endDate: marketingAction.endDate,
      channel: marketingAction.channel,
      spent: marketingAction.spent,
      budget: marketingAction.budget,
      campaignName: marketingCampaign.name,
    })
    .from(marketingAction)
    .leftJoin(marketingCampaign, eq(marketingCampaign.id, marketingAction.campaignId))
    .where(and(eq(marketingAction.tenantId, tenantId), gte(marketingAction.startDate, fromDate)))
    .orderBy(asc(marketingAction.startDate))
    .limit(limit);
}

/** Ações dentro de um intervalo (para grade de calendário mensal). */
export async function actionsInRange(tenantId: string, startInclusive: string, endExclusive: string) {
  return db
    .select({
      id: marketingAction.id,
      name: marketingAction.name,
      actionType: marketingAction.actionType,
      status: marketingAction.status,
      startDate: marketingAction.startDate,
      channel: marketingAction.channel,
    })
    .from(marketingAction)
    .where(
      and(
        eq(marketingAction.tenantId, tenantId),
        isNotNull(marketingAction.startDate),
        gte(marketingAction.startDate, startInclusive),
        sql`${marketingAction.startDate} < ${endExclusive}`,
      ),
    )
    .orderBy(asc(marketingAction.startDate));
}
