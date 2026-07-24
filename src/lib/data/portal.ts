import "server-only";
import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contract,
  royaltyReport,
  royaltyReportLine,
  royaltyReportValidation,
  royaltyRule,
  receivable,
  payment,
  currency,
  licensee,
} from "@/lib/db/schema";

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

/** Contratos do licenciado com a alíquota de royalty vigente (para o formulário de reporte). */
export async function getLicenseeContractsForReport(tenantId: string, licenseeId: string) {
  const rows = await db
    .select({
      id: contract.id,
      contractNumber: contract.contractNumber,
      currencyId: contract.currencyId,
      percentage: royaltyRule.percentage,
      minRoyalty: royaltyRule.minRoyalty,
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

  return rows.map((r) => ({
    id: r.id,
    contractNumber: r.contractNumber,
    currencyId: r.currencyId,
    ratePct: Math.round(toRate(r.percentage) * 10000) / 100, // ex.: 15
    minRoyalty: r.minRoyalty ? Number(r.minRoyalty) : null,
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
    .select({ percentage: royaltyRule.percentage, minRoyalty: royaltyRule.minRoyalty })
    .from(royaltyRule)
    .where(and(eq(royaltyRule.contractId, contractId), eq(royaltyRule.isActive, true)))
    .limit(1);
  const rate = toRate(ruleRows[0]?.percentage ?? null);
  const minRoyalty = ruleRows[0]?.minRoyalty ? Number(ruleRows[0].minRoyalty) : null;

  // Cálculo por linha + totais.
  const computed = lines.map((l) => {
    const gross = Number(l.grossAmount) || 0;
    const ded = Number(l.deductions) || 0;
    const net = gross - ded;
    const royalty = Math.max(0, net) * rate;
    return { ...l, gross, ded, net, royalty };
  });
  const grossTotal = computed.reduce((a, b) => a + b.gross, 0);
  const netTotal = computed.reduce((a, b) => a + b.net, 0);
  const unitsTotal = computed.reduce((a, b) => a + (Number(b.units) || 0), 0);
  const royaltyCalculated = computed.reduce((a, b) => a + b.royalty, 0);

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
  if (minRoyalty != null && royaltyCalculated < minRoyalty)
    V(
      "warning",
      `Royalty calculado (${royaltyCalculated.toFixed(2)}) abaixo do mínimo contratual (${minRoyalty.toFixed(2)}).`,
      "ABAIXO_MINIMO",
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
      computed.map((l) => ({
        tenantId,
        royaltyReportId: reportId,
        sku: l.sku || null,
        productName: l.productName || null,
        units: String(Number(l.units) || 0),
        unitPrice: String((Number(l.units) || 0) > 0 ? l.gross / (Number(l.units) || 1) : 0),
        grossAmount: String(l.gross),
        netAmount: String(l.net),
        royaltyBaseAmt: String(Math.max(0, l.net)),
        royaltyRate: String(rate),
        royaltyAmount: String(l.royalty),
        currencyId: ctr.currencyId,
      })),
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
