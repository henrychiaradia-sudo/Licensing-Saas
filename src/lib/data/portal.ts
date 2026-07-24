import "server-only";
import { and, eq, desc, sql, isNull, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contract,
  contractBrand,
  royaltyReport,
  royaltyReportLine,
  royaltyReportValidation,
  royaltyRule,
  royaltyTier,
  receivable,
  payment,
  currency,
  licensee,
  product,
  productApproval,
  approvalStage,
  brand,
  category,
} from "@/lib/db/schema";
import type { ApprovalStageType } from "@/lib/db/schema";
import { computeRoyalty } from "@/lib/royalties-engine";

/** Converte percentual armazenado (0.15 ou 15) para fração (0.15). */
function toRate(pct: string | null): number {
  if (pct == null) return 0;
  const v = Number(pct);
  if (Number.isNaN(v)) return 0;
  return v <= 1 ? v : v / 100;
}

export async function getLicenseeName(tenantId: string, licenseeId: string) {
  const rows = await db
    .select({ legalName: licensee.legalName, tradeName: licensee.tradeName })
    .from(licensee)
    .where(and(eq(licensee.id, licenseeId), eq(licensee.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPortalOverview(tenantId: string, licenseeId: string) {
  const scope = and(eq(contract.tenantId, tenantId), eq(contract.licenseeId, licenseeId));

  const contracts = await db
    .select({ c: sql<number>`count(*) filter (where ${contract.status} = 'vigente')::int` })
    .from(contract)
    .where(scope);

  const latest = await db
    .select({ p: sql<string | null>`max(${royaltyReport.periodStart})` })
    .from(royaltyReport)
    .where(and(eq(royaltyReport.tenantId, tenantId), eq(royaltyReport.licenseeId, licenseeId)));
  const period = latest[0]?.p ?? null;
  let competencia = 0;
  if (period) {
    const r = await db
      .select({ total: sql<string>`coalesce(sum(${royaltyReport.royaltyCalculated}), 0)` })
      .from(royaltyReport)
      .where(
        and(
          eq(royaltyReport.tenantId, tenantId),
          eq(royaltyReport.licenseeId, licenseeId),
          eq(royaltyReport.periodStart, period),
        ),
      );
    competencia = Number(r[0]?.total ?? 0);
  }

  const rec = await db
    .select({
      outstanding: sql<string>`coalesce(sum(${receivable.amount} - ${receivable.paidAmount}) filter (where ${receivable.status} not in ('pago','cancelado')), 0)`,
    })
    .from(receivable)
    .where(and(eq(receivable.tenantId, tenantId), eq(receivable.licenseeId, licenseeId)));

  const pend = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(royaltyReport)
    .where(
      and(
        eq(royaltyReport.tenantId, tenantId),
        eq(royaltyReport.licenseeId, licenseeId),
        sql`${royaltyReport.status} in ('rascunho','com_divergencia')`,
      ),
    );

  return {
    activeContracts: contracts[0]?.c ?? 0,
    competencia,
    outstanding: Number(rec[0]?.outstanding ?? 0),
    pendingReports: pend[0]?.c ?? 0,
  };
}

export async function listPortalContracts(tenantId: string, licenseeId: string) {
  return db
    .select({
      id: contract.id,
      contractNumber: contract.contractNumber,
      status: contract.status,
      exclusivity: contract.exclusivity,
      startDate: contract.startDate,
      endDate: contract.endDate,
      minimumGuaranteeTotal: contract.minimumGuaranteeTotal,
      currencyIso: currency.isoCode,
    })
    .from(contract)
    .leftJoin(currency, eq(currency.id, contract.currencyId))
    .where(and(eq(contract.tenantId, tenantId), eq(contract.licenseeId, licenseeId)))
    .orderBy(desc(contract.startDate));
}

export async function listPortalReports(tenantId: string, licenseeId: string) {
  return db
    .select({
      id: royaltyReport.id,
      referenceLabel: royaltyReport.referenceLabel,
      status: royaltyReport.status,
      periodStart: royaltyReport.periodStart,
      netSalesTotal: royaltyReport.netSalesTotal,
      royaltyCalculated: royaltyReport.royaltyCalculated,
      variance: royaltyReport.variance,
      currencyIso: currency.isoCode,
      contractNumber: contract.contractNumber,
    })
    .from(royaltyReport)
    .leftJoin(currency, eq(currency.id, royaltyReport.currencyId))
    .leftJoin(contract, eq(contract.id, royaltyReport.contractId))
    .where(and(eq(royaltyReport.tenantId, tenantId), eq(royaltyReport.licenseeId, licenseeId)))
    .orderBy(desc(royaltyReport.periodStart))
    .limit(200);
}

export async function getPortalReport(tenantId: string, licenseeId: string, id: string) {
  const rows = await db
    .select({
      id: royaltyReport.id,
      referenceLabel: royaltyReport.referenceLabel,
      status: royaltyReport.status,
      periodStart: royaltyReport.periodStart,
      periodEnd: royaltyReport.periodEnd,
      grossSalesTotal: royaltyReport.grossSalesTotal,
      netSalesTotal: royaltyReport.netSalesTotal,
      unitsTotal: royaltyReport.unitsTotal,
      royaltyDeclared: royaltyReport.royaltyDeclared,
      royaltyCalculated: royaltyReport.royaltyCalculated,
      variance: royaltyReport.variance,
      submittedAt: royaltyReport.submittedAt,
      contractId: royaltyReport.contractId,
      currencyIso: currency.isoCode,
      contractNumber: contract.contractNumber,
    })
    .from(royaltyReport)
    .leftJoin(currency, eq(currency.id, royaltyReport.currencyId))
    .leftJoin(contract, eq(contract.id, royaltyReport.contractId))
    .where(
      and(
        eq(royaltyReport.id, id),
        eq(royaltyReport.tenantId, tenantId),
        eq(royaltyReport.licenseeId, licenseeId),
      ),
    )
    .limit(1);
  const report = rows[0];
  if (!report) return null;

  const lines = await db
    .select()
    .from(royaltyReportLine)
    .where(eq(royaltyReportLine.royaltyReportId, id))
    .orderBy(desc(royaltyReportLine.royaltyAmount));

  const validations = await db
    .select()
    .from(royaltyReportValidation)
    .where(eq(royaltyReportValidation.royaltyReportId, id))
    .orderBy(desc(royaltyReportValidation.createdAt));

  return { report, lines, validations };
}

export async function listPortalReceivables(tenantId: string, licenseeId: string) {
  return db
    .select({
      id: receivable.id,
      description: receivable.description,
      amount: receivable.amount,
      paidAmount: receivable.paidAmount,
      status: receivable.status,
      dueDate: receivable.dueDate,
      currencyIso: currency.isoCode,
    })
    .from(receivable)
    .leftJoin(currency, eq(currency.id, receivable.currencyId))
    .where(and(eq(receivable.tenantId, tenantId), eq(receivable.licenseeId, licenseeId)))
    .orderBy(desc(receivable.dueDate));
}

export async function listPortalPayments(tenantId: string, licenseeId: string) {
  return db
    .select({
      id: payment.id,
      method: payment.method,
      amount: payment.amount,
      paidAt: payment.paidAt,
      currencyIso: currency.isoCode,
      description: receivable.description,
    })
    .from(payment)
    .leftJoin(receivable, eq(receivable.id, payment.receivableId))
    .leftJoin(currency, eq(currency.id, payment.currencyId))
    .where(and(eq(payment.tenantId, tenantId), eq(receivable.licenseeId, licenseeId)))
    .orderBy(desc(payment.paidAt));
}

export type ContractRuleForReport = {
  royaltyType: "percentual" | "fixo" | "hibrido" | "escalonado";
  percentage: number | null;
  fixedAmount: number | null;
  minRoyalty: number | null;
  maxRoyalty: number | null;
};
export type ContractTierForReport = { tierFrom: number; tierTo: number | null; rate: number };

/** Contratos do licenciado com a regra de royalty vigente + faixas (para o formulário de reporte). */
export async function getLicenseeContractsForReport(tenantId: string, licenseeId: string) {
  const rows = await db
    .select({
      id: contract.id,
      contractNumber: contract.contractNumber,
      currencyId: contract.currencyId,
      ruleId: royaltyRule.id,
      royaltyType: royaltyRule.royaltyType,
      percentage: royaltyRule.percentage,
      fixedAmount: royaltyRule.fixedAmount,
      minRoyalty: royaltyRule.minRoyalty,
      maxRoyalty: royaltyRule.maxRoyalty,
    })
    .from(contract)
    .leftJoin(
      royaltyRule,
      and(eq(royaltyRule.contractId, contract.id), eq(royaltyRule.isActive, true)),
    )
    .where(
      and(
        eq(contract.tenantId, tenantId),
        eq(contract.licenseeId, licenseeId),
        eq(contract.status, "vigente"),
      ),
    )
    .orderBy(desc(contract.startDate));

  const ruleIds = rows.map((r) => r.ruleId).filter((x): x is string => Boolean(x));
  const tiersByRule = new Map<string, ContractTierForReport[]>();
  if (ruleIds.length) {
    const t = await db
      .select({
        ruleId: royaltyTier.royaltyRuleId,
        tierFrom: royaltyTier.tierFrom,
        tierTo: royaltyTier.tierTo,
        rate: royaltyTier.rate,
      })
      .from(royaltyTier)
      .where(inArray(royaltyTier.royaltyRuleId, ruleIds));
    for (const row of t) {
      const arr = tiersByRule.get(row.ruleId) ?? [];
      arr.push({
        tierFrom: Number(row.tierFrom),
        tierTo: row.tierTo == null ? null : Number(row.tierTo),
        rate: Number(row.rate),
      });
      tiersByRule.set(row.ruleId, arr);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    contractNumber: r.contractNumber,
    currencyId: r.currencyId,
    ratePct: Math.round(toRate(r.percentage) * 10000) / 100, // ex.: 15
    minRoyalty: r.minRoyalty ? Number(r.minRoyalty) : null,
    rule: r.ruleId
      ? ({
          royaltyType: r.royaltyType ?? "percentual",
          percentage: r.percentage == null ? null : Number(r.percentage),
          fixedAmount: r.fixedAmount == null ? null : Number(r.fixedAmount),
          minRoyalty: r.minRoyalty == null ? null : Number(r.minRoyalty),
          maxRoyalty: r.maxRoyalty == null ? null : Number(r.maxRoyalty),
        } satisfies ContractRuleForReport)
      : null,
    tiers: r.ruleId ? tiersByRule.get(r.ruleId) ?? [] : [],
  }));
}

export type ReportLineInput = {
  sku: string;
  productName: string;
  units: number;
  grossAmount: number;
  deductions: number;
};

export type SubmitResult = {
  reportId: string;
  status: "enviado" | "com_divergencia";
  validations: { severity: "info" | "warning" | "error"; message: string; code: string }[];
};

/** Submete um reporte de royalties: calcula totais, roda validações e grava. */
export async function submitRoyaltyReport(params: {
  tenantId: string;
  licenseeId: string;
  userId: string;
  contractId: string;
  referenceLabel: string;
  periodStart: string;
  periodEnd: string;
  lines: ReportLineInput[];
}): Promise<SubmitResult> {
  const { tenantId, licenseeId, userId, contractId, referenceLabel, periodStart, periodEnd, lines } =
    params;

  // Segurança: o contrato precisa ser deste licenciado.
  const ctrRows = await db
    .select({ id: contract.id, currencyId: contract.currencyId })
    .from(contract)
    .where(
      and(
        eq(contract.id, contractId),
        eq(contract.tenantId, tenantId),
        eq(contract.licenseeId, licenseeId),
      ),
    )
    .limit(1);
  const ctr = ctrRows[0];
  if (!ctr) throw new Error("Contrato inválido para este licenciado.");

  const ruleRows = await db
    .select({
      id: royaltyRule.id,
      royaltyType: royaltyRule.royaltyType,
      percentage: royaltyRule.percentage,
      fixedAmount: royaltyRule.fixedAmount,
      minRoyalty: royaltyRule.minRoyalty,
      maxRoyalty: royaltyRule.maxRoyalty,
    })
    .from(royaltyRule)
    .where(and(eq(royaltyRule.contractId, contractId), eq(royaltyRule.isActive, true)))
    .limit(1);
  const ruleRow = ruleRows[0] ?? null;
  let tiers: { tierFrom: number; tierTo: number | null; rate: number }[] = [];
  if (ruleRow) {
    const t = await db
      .select({ tierFrom: royaltyTier.tierFrom, tierTo: royaltyTier.tierTo, rate: royaltyTier.rate })
      .from(royaltyTier)
      .where(eq(royaltyTier.royaltyRuleId, ruleRow.id));
    tiers = t.map((x) => ({
      tierFrom: Number(x.tierFrom),
      tierTo: x.tierTo == null ? null : Number(x.tierTo),
      rate: Number(x.rate),
    }));
  }
  const minRoyalty = ruleRow?.minRoyalty ? Number(ruleRow.minRoyalty) : null;

  // Base por linha + totais.
  const computed = lines.map((l) => {
    const gross = Number(l.grossAmount) || 0;
    const ded = Number(l.deductions) || 0;
    const net = gross - ded;
    return { ...l, gross, ded, net, base: Math.max(0, net) };
  });
  const grossTotal = computed.reduce((a, b) => a + b.gross, 0);
  const netTotal = computed.reduce((a, b) => a + b.net, 0);
  const unitsTotal = computed.reduce((a, b) => a + (Number(b.units) || 0), 0);
  const baseTotal = computed.reduce((a, b) => a + b.base, 0);

  // Motor de royalties (percentual, faixas escalonadas, piso/teto).
  const comp = computeRoyalty(
    baseTotal,
    ruleRow ?? { royaltyType: "percentual", percentage: null },
    tiers,
  );
  const royaltyCalculated = comp.royalty;
  const effRate = comp.effectiveRate;

  // Validações automáticas.
  const validations: SubmitResult["validations"] = [];
  const V = (severity: "info" | "warning" | "error", message: string, code: string) => {
    validations.push({ severity, message, code });
  };

  if (computed.length === 0) V("error", "O reporte não possui linhas.", "SEM_LINHAS");
  computed.forEach((l, i) => {
    const n = i + 1;
    if (!l.sku?.trim() || !l.productName?.trim())
      V("warning", `Linha ${n}: SKU ou produto não informado.`, "SKU_VAZIO");
    if ((Number(l.units) || 0) <= 0) V("warning", `Linha ${n}: quantidade deve ser maior que zero.`, "QTD_ZERO");
    if (l.gross <= 0) V("warning", `Linha ${n}: venda bruta deve ser maior que zero.`, "BRUTO_ZERO");
    if (l.net < 0) V("error", `Linha ${n}: deduções maiores que a venda bruta (líquido negativo).`, "LIQUIDO_NEGATIVO");
    else if (l.gross > 0 && l.ded / l.gross > 0.4)
      V("warning", `Linha ${n}: deduções acima de 40% da venda bruta.`, "DEDUCAO_ALTA");
  });
  if (comp.minApplied && minRoyalty != null)
    V(
      "warning",
      `Royalty apurado ficou abaixo do mínimo contratual; aplicado o piso de ${minRoyalty.toFixed(2)}.`,
      "MINIMO_APLICADO",
    );
  if (comp.maxApplied && ruleRow?.maxRoyalty)
    V(
      "info",
      `Royalty apurado atingiu o teto contratual de ${Number(ruleRow.maxRoyalty).toFixed(2)}.`,
      "TETO_APLICADO",
    );

  const hasError = validations.some((v) => v.severity === "error");
  const status = hasError ? "com_divergencia" : "enviado";

  // Grava o reporte.
  const inserted = await db
    .insert(royaltyReport)
    .values({
      tenantId,
      contractId,
      licenseeId,
      referenceLabel,
      periodStart,
      periodEnd,
      source: "manual",
      status,
      currencyId: ctr.currencyId,
      grossSalesTotal: String(grossTotal),
      netSalesTotal: String(netTotal),
      unitsTotal: String(unitsTotal),
      royaltyDeclared: String(royaltyCalculated),
      royaltyCalculated: String(royaltyCalculated),
      variance: "0",
      submittedBy: userId,
      submittedAt: new Date(),
    })
    .returning({ id: royaltyReport.id });
  const reportId = inserted[0].id;

  if (computed.length) {
    await db.insert(royaltyReportLine).values(
      computed.map((l) => {
        // Aloca o royalty total (já com faixas/piso/teto) proporcional à base de cada linha.
        const lineRoyalty = baseTotal > 0 ? royaltyCalculated * (l.base / baseTotal) : 0;
        return {
          tenantId,
          royaltyReportId: reportId,
          sku: l.sku || null,
          productName: l.productName || null,
          units: String(Number(l.units) || 0),
          unitPrice: String((Number(l.units) || 0) > 0 ? l.gross / (Number(l.units) || 1) : 0),
          grossAmount: String(l.gross),
          netAmount: String(l.net),
          royaltyBaseAmt: String(l.base),
          royaltyRate: String(effRate),
          royaltyAmount: String(lineRoyalty),
          currencyId: ctr.currencyId,
        };
      }),
    );
  }

  if (validations.length) {
    await db.insert(royaltyReportValidation).values(
      validations.map((v) => ({
        royaltyReportId: reportId,
        ruleCode: v.code,
        severity: v.severity,
        message: v.message,
      })),
    );
  }

  return { reportId, status, validations };
}

/* ---------------- Produtos & Aprovações (portal do licenciado) ---------------- */

/** Marcas licenciadas ao licenciado (para o formulário de submissão de produto). */
export async function getLicenseeBrandsForProduct(tenantId: string, licenseeId: string) {
  return db
    .selectDistinct({ id: brand.id, name: brand.name })
    .from(contractBrand)
    .innerJoin(contract, eq(contract.id, contractBrand.contractId))
    .innerJoin(brand, eq(brand.id, contractBrand.brandId))
    .where(and(eq(contract.tenantId, tenantId), eq(contract.licenseeId, licenseeId)))
    .orderBy(brand.name);
}

/** Categorias do tenant (para o formulário de submissão de produto). */
export async function listTenantCategories(tenantId: string) {
  return db
    .select({ id: category.id, name: category.name })
    .from(category)
    .where(eq(category.tenantId, tenantId))
    .orderBy(category.name);
}

/** Produtos do licenciado com o progresso de aprovação (alçadas aprovadas / total). */
export async function listPortalProducts(tenantId: string, licenseeId: string) {
  const rows = await db
    .select({
      id: product.id,
      sku: product.sku,
      name: product.name,
      status: product.status,
      currentVersion: product.currentVersion,
      brandName: brand.name,
      approvalId: productApproval.id,
    })
    .from(product)
    .leftJoin(brand, eq(brand.id, product.brandId))
    .leftJoin(
      productApproval,
      and(eq(productApproval.productId, product.id), eq(productApproval.version, product.currentVersion)),
    )
    .where(and(eq(product.tenantId, tenantId), eq(product.licenseeId, licenseeId), isNull(product.deletedAt)))
    .orderBy(desc(product.createdAt))
    .limit(200);

  const apprIds = rows.map((r) => r.approvalId).filter((x): x is string => Boolean(x));
  const progress = new Map<string, { done: number; total: number }>();
  if (apprIds.length) {
    const counts = await db
      .select({
        approvalId: approvalStage.productApprovalId,
        total: sql<number>`count(*)::int`,
        done: sql<number>`count(*) filter (where ${approvalStage.decision} <> 'pendente')::int`,
      })
      .from(approvalStage)
      .where(inArray(approvalStage.productApprovalId, apprIds))
      .groupBy(approvalStage.productApprovalId);
    for (const c of counts) progress.set(c.approvalId, { done: c.done, total: c.total });
  }

  return rows.map((r) => {
    const p = r.approvalId ? progress.get(r.approvalId) : undefined;
    return { ...r, done: p?.done ?? 0, total: p?.total ?? 0 };
  });
}

/** Detalhe de um produto do licenciado + aprovação + alçadas (escopado ao licenciado). */
export async function getPortalProduct(tenantId: string, licenseeId: string, id: string) {
  const rows = await db
    .select({
      id: product.id,
      sku: product.sku,
      name: product.name,
      productLine: product.productLine,
      status: product.status,
      brandName: brand.name,
      supplierName: product.supplierName,
      material: product.material,
      color: product.color,
      suggestedPrice: product.suggestedPrice,
      barcode: product.barcode,
      currentVersion: product.currentVersion,
    })
    .from(product)
    .leftJoin(brand, eq(brand.id, product.brandId))
    .where(
      and(eq(product.id, id), eq(product.tenantId, tenantId), eq(product.licenseeId, licenseeId)),
    )
    .limit(1);
  const prod = rows[0];
  if (!prod) return null;

  const appr = await db
    .select()
    .from(productApproval)
    .where(and(eq(productApproval.productId, id), eq(productApproval.tenantId, tenantId)))
    .orderBy(desc(productApproval.version))
    .limit(1);
  const approval = appr[0] ?? null;

  const stages = approval
    ? await db
        .select()
        .from(approvalStage)
        .where(eq(approvalStage.productApprovalId, approval.id))
        .orderBy(approvalStage.sequence)
    : [];

  return { product: prod, approval, stages };
}

/** Alçadas padrão criadas quando um produto é submetido para aprovação. */
const DEFAULT_APPROVAL_STAGES: { stageType: ApprovalStageType; slaHours: number }[] = [
  { stageType: "produto", slaHours: 48 },
  { stageType: "marketing", slaHours: 48 },
  { stageType: "branding", slaHours: 48 },
  { stageType: "juridico", slaHours: 72 },
  { stageType: "compliance", slaHours: 72 },
  { stageType: "qualidade", slaHours: 48 },
  { stageType: "licensing", slaHours: 48 },
  { stageType: "diretoria", slaHours: 72 },
];

/** Submete um novo produto para o fluxo de aprovação (cria produto + aprovação + 8 alçadas). */
export async function submitProductForApproval(params: {
  tenantId: string;
  licenseeId: string;
  userId: string;
  brandId: string;
  sku: string;
  name: string;
  productLine?: string | null;
  categoryId?: string | null;
  material?: string | null;
  color?: string | null;
  supplierName?: string | null;
  suggestedPrice?: number | null;
}): Promise<{ productId: string }> {
  const { tenantId, licenseeId, userId, brandId } = params;

  // Segurança: a marca precisa estar licenciada a este licenciado.
  const allowed = await db
    .select({ brandId: contractBrand.brandId })
    .from(contractBrand)
    .innerJoin(contract, eq(contract.id, contractBrand.contractId))
    .where(
      and(
        eq(contract.tenantId, tenantId),
        eq(contract.licenseeId, licenseeId),
        eq(contractBrand.brandId, brandId),
      ),
    )
    .limit(1);
  if (!allowed[0]) throw new Error("Marca não licenciada para este licenciado.");

  // SKU único por tenant.
  const dup = await db
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.tenantId, tenantId), eq(product.sku, params.sku)))
    .limit(1);
  if (dup[0]) throw new Error(`Já existe um produto com o SKU "${params.sku}".`);

  const insertedProduct = await db
    .insert(product)
    .values({
      tenantId,
      sku: params.sku,
      name: params.name,
      productLine: params.productLine ?? null,
      categoryId: params.categoryId ?? null,
      brandId,
      licenseeId,
      supplierName: params.supplierName ?? null,
      material: params.material ?? null,
      color: params.color ?? null,
      suggestedPrice: params.suggestedPrice != null ? String(params.suggestedPrice) : null,
      status: "submetido",
      currentVersion: 1,
    })
    .returning({ id: product.id });
  const productId = insertedProduct[0].id;

  const due = new Date();
  due.setDate(due.getDate() + 10);
  const insertedAppr = await db
    .insert(productApproval)
    .values({
      tenantId,
      productId,
      version: 1,
      status: "em_aprovacao",
      overallDecision: "pendente",
      submittedBy: userId,
      submittedAt: new Date(),
      slaDueDate: due.toISOString().slice(0, 10),
    })
    .returning({ id: productApproval.id });
  const approvalId = insertedAppr[0].id;

  await db.insert(approvalStage).values(
    DEFAULT_APPROVAL_STAGES.map((s, i) => ({
      tenantId,
      productApprovalId: approvalId,
      stageType: s.stageType,
      sequence: i + 1,
      decision: "pendente" as const,
      slaHours: s.slaHours,
    })),
  );

  return { productId };
}

/**
 * Reenvia uma nova versão de um produto reprovado: atualiza a ficha, incrementa a
 * versão, volta o produto a "submetido" e cria uma nova aprovação com as 8 alçadas.
 */
export async function resubmitProduct(params: {
  tenantId: string;
  licenseeId: string;
  userId: string;
  productId: string;
  name: string;
  productLine?: string | null;
  material?: string | null;
  color?: string | null;
  supplierName?: string | null;
  suggestedPrice?: number | null;
}): Promise<{ productId: string; version: number }> {
  const { tenantId, licenseeId, userId, productId } = params;

  const rows = await db
    .select({ id: product.id, status: product.status, currentVersion: product.currentVersion })
    .from(product)
    .where(
      and(
        eq(product.id, productId),
        eq(product.tenantId, tenantId),
        eq(product.licenseeId, licenseeId),
      ),
    )
    .limit(1);
  const prod = rows[0];
  if (!prod) throw new Error("Produto não encontrado.");
  if (prod.status !== "reprovado")
    throw new Error("Só é possível reenviar uma nova versão de produtos reprovados.");

  const newVersion = prod.currentVersion + 1;

  await db
    .update(product)
    .set({
      name: params.name,
      productLine: params.productLine ?? null,
      material: params.material ?? null,
      color: params.color ?? null,
      supplierName: params.supplierName ?? null,
      suggestedPrice: params.suggestedPrice != null ? String(params.suggestedPrice) : null,
      status: "submetido",
      currentVersion: newVersion,
      updatedAt: new Date(),
    })
    .where(and(eq(product.id, productId), eq(product.tenantId, tenantId)));

  const due = new Date();
  due.setDate(due.getDate() + 10);
  const insertedAppr = await db
    .insert(productApproval)
    .values({
      tenantId,
      productId,
      version: newVersion,
      status: "em_aprovacao",
      overallDecision: "pendente",
      submittedBy: userId,
      submittedAt: new Date(),
      slaDueDate: due.toISOString().slice(0, 10),
    })
    .returning({ id: productApproval.id });
  const approvalId = insertedAppr[0].id;

  await db.insert(approvalStage).values(
    DEFAULT_APPROVAL_STAGES.map((s, i) => ({
      tenantId,
      productApprovalId: approvalId,
      stageType: s.stageType,
      sequence: i + 1,
      decision: "pendente" as const,
      slaHours: s.slaHours,
    })),
  );

  return { productId, version: newVersion };
}
