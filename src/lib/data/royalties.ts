import "server-only";
import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  royaltyReport,
  royaltyReportLine,
  royaltyReportValidation,
  contract,
  licensee,
  currency,
} from "@/lib/db/schema";

export async function listRoyaltyReports(tenantId: string) {
  return db
    .select({
      id: royaltyReport.id,
      referenceLabel: royaltyReport.referenceLabel,
      status: royaltyReport.status,
      periodStart: royaltyReport.periodStart,
      periodEnd: royaltyReport.periodEnd,
      netSalesTotal: royaltyReport.netSalesTotal,
      royaltyDeclared: royaltyReport.royaltyDeclared,
      royaltyCalculated: royaltyReport.royaltyCalculated,
      variance: royaltyReport.variance,
      currencyIso: currency.isoCode,
      licenseeName: licensee.legalName,
      contractNumber: contract.contractNumber,
    })
    .from(royaltyReport)
    .leftJoin(licensee, eq(licensee.id, royaltyReport.licenseeId))
    .leftJoin(contract, eq(contract.id, royaltyReport.contractId))
    .leftJoin(currency, eq(currency.id, royaltyReport.currencyId))
    .where(eq(royaltyReport.tenantId, tenantId))
    .orderBy(desc(royaltyReport.periodStart))
    .limit(200);
}

export async function getRoyaltyReportDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: royaltyReport.id,
      referenceLabel: royaltyReport.referenceLabel,
      status: royaltyReport.status,
      source: royaltyReport.source,
      periodStart: royaltyReport.periodStart,
      periodEnd: royaltyReport.periodEnd,
      grossSalesTotal: royaltyReport.grossSalesTotal,
      netSalesTotal: royaltyReport.netSalesTotal,
      unitsTotal: royaltyReport.unitsTotal,
      royaltyDeclared: royaltyReport.royaltyDeclared,
      royaltyCalculated: royaltyReport.royaltyCalculated,
      variance: royaltyReport.variance,
      approvedAt: royaltyReport.approvedAt,
      submittedAt: royaltyReport.submittedAt,
      currencyIso: currency.isoCode,
      licenseeName: licensee.legalName,
      contractNumber: contract.contractNumber,
    })
    .from(royaltyReport)
    .leftJoin(licensee, eq(licensee.id, royaltyReport.licenseeId))
    .leftJoin(contract, eq(contract.id, royaltyReport.contractId))
    .leftJoin(currency, eq(currency.id, royaltyReport.currencyId))
    .where(and(eq(royaltyReport.id, id), eq(royaltyReport.tenantId, tenantId)))
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

/** Soma dos royalties calculados na competência mais recente (para o KPI do dashboard). */
export async function royaltiesCompetencia(tenantId: string) {
  const latest = await db
    .select({ p: sql<string | null>`max(${royaltyReport.periodStart})` })
    .from(royaltyReport)
    .where(eq(royaltyReport.tenantId, tenantId));
  const period = latest[0]?.p;
  if (!period) return 0;
  const rows = await db
    .select({ total: sql<string>`coalesce(sum(${royaltyReport.royaltyCalculated}), 0)` })
    .from(royaltyReport)
    .where(and(eq(royaltyReport.tenantId, tenantId), eq(royaltyReport.periodStart, period)));
  return Number(rows[0]?.total ?? 0);
}

/** Aprova um relatório de royalties. */
export async function approveRoyaltyReport(tenantId: string, id: string, userId: string) {
  await db
    .update(royaltyReport)
    .set({ status: "aprovado", approvedBy: userId, approvedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(royaltyReport.id, id), eq(royaltyReport.tenantId, tenantId)));
}
