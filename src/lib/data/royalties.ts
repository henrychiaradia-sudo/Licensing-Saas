import "server-only";
import { and, eq, desc, sql, count, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  royaltyReport,
  royaltyReportLine,
  royaltyReportValidation,
  royaltyRule,
  royaltyTier,
  contract,
  licensee,
  currency,
  receivable,
  invoice,
  ledgerEntry,
} from "@/lib/db/schema";
import type { RoyaltyType, RoyaltyBase, RoyaltyReportStatus } from "@/lib/db/schema";

export async function listRoyaltyReports(
  tenantId: string,
  opts?: { status?: RoyaltyReportStatus; q?: string },
) {
  const conds = [eq(royaltyReport.tenantId, tenantId)];
  if (opts?.status) conds.push(eq(royaltyReport.status, opts.status));
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const match = or(
      ilike(royaltyReport.referenceLabel, term),
      ilike(licensee.legalName, term),
      ilike(contract.contractNumber, term),
    );
    if (match) conds.push(match);
  }
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
    .where(and(...conds))
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
      contractId: royaltyReport.contractId,
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

/** Nota de débito (fatura) emitida a partir de um relatório de royalty aprovado, se houver. */
export async function getReportInvoice(tenantId: string, reportId: string) {
  const rows = await db
    .select({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      netAmount: invoice.netAmount,
      status: invoice.status,
      currencyIso: currency.isoCode,
    })
    .from(receivable)
    .innerJoin(invoice, eq(invoice.id, receivable.invoiceId))
    .leftJoin(currency, eq(currency.id, invoice.currencyId))
    .where(and(eq(receivable.tenantId, tenantId), eq(receivable.royaltyReportId, reportId)))
    .limit(1);
  return rows[0] ?? null;
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

/** Aprova o relatório e gera a cobrança (recebível) + lançamento no razão. Idempotente. */
export async function approveAndInvoiceReport(tenantId: string, id: string, userId: string) {
  const rows = await db
    .select({
      licenseeId: royaltyReport.licenseeId,
      contractId: royaltyReport.contractId,
      currencyId: royaltyReport.currencyId,
      royalty: royaltyReport.royaltyCalculated,
      ref: royaltyReport.referenceLabel,
      status: royaltyReport.status,
    })
    .from(royaltyReport)
    .where(and(eq(royaltyReport.id, id), eq(royaltyReport.tenantId, tenantId)))
    .limit(1);
  const rep = rows[0];
  if (!rep || rep.status === "aprovado") return;

  await db
    .update(royaltyReport)
    .set({ status: "aprovado", approvedBy: userId, approvedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(royaltyReport.id, id), eq(royaltyReport.tenantId, tenantId)));

  // Evita recebível duplicado para o mesmo reporte.
  const existing = await db
    .select({ c: count() })
    .from(receivable)
    .where(and(eq(receivable.tenantId, tenantId), eq(receivable.royaltyReportId, id)));
  if ((existing[0]?.c ?? 0) > 0) return;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const due = new Date(now);
  due.setDate(due.getDate() + 30);
  const dueStr = due.toISOString().slice(0, 10);

  // Emite a nota de débito (fatura) da competência aprovada.
  const invCount = await db
    .select({ c: count() })
    .from(invoice)
    .where(eq(invoice.tenantId, tenantId));
  const invNumber = `ND-${todayStr.slice(0, 4)}-${String((invCount[0]?.c ?? 0) + 1).padStart(4, "0")}`;
  const insertedInvoice = await db
    .insert(invoice)
    .values({
      tenantId,
      licenseeId: rep.licenseeId,
      contractId: rep.contractId,
      invoiceNumber: invNumber,
      issueDate: todayStr,
      dueDate: dueStr,
      grossAmount: rep.royalty,
      netAmount: rep.royalty,
      currencyId: rep.currencyId,
      status: "emitida",
    })
    .returning({ id: invoice.id });
  const invoiceId = insertedInvoice[0].id;

  await db.insert(receivable).values({
    tenantId,
    licenseeId: rep.licenseeId,
    contractId: rep.contractId,
    invoiceId,
    royaltyReportId: id,
    description: `Royalty ${rep.ref}`,
    amount: rep.royalty,
    paidAmount: "0",
    currencyId: rep.currencyId,
    dueDate: dueStr,
    status: "emitido",
  });

  await db.insert(ledgerEntry).values({
    tenantId,
    licenseeId: rep.licenseeId,
    contractId: rep.contractId,
    entryType: "royalty",
    amount: rep.royalty,
    currencyId: rep.currencyId,
    entryDate: todayStr,
    description: `Royalty apurado ${rep.ref}`,
  });
}

/** Rejeita um relatório de royalties. */
export async function rejectRoyaltyReport(tenantId: string, id: string) {
  await db
    .update(royaltyReport)
    .set({ status: "rejeitado", updatedAt: new Date() })
    .where(and(eq(royaltyReport.id, id), eq(royaltyReport.tenantId, tenantId)));
}

/** Regra de royalty vigente de um contrato + suas faixas (ordenadas). */
export async function getContractRoyaltyRule(tenantId: string, contractId: string) {
  const rules = await db
    .select()
    .from(royaltyRule)
    .where(
      and(
        eq(royaltyRule.contractId, contractId),
        eq(royaltyRule.tenantId, tenantId),
        eq(royaltyRule.isActive, true),
      ),
    )
    .orderBy(desc(royaltyRule.createdAt))
    .limit(1);
  const rule = rules[0] ?? null;
  const tiers = rule
    ? await db
        .select()
        .from(royaltyTier)
        .where(eq(royaltyTier.royaltyRuleId, rule.id))
        .orderBy(royaltyTier.tierFrom)
    : [];
  return { rule, tiers };
}

export type RoyaltyRuleFormInput = {
  royaltyType: RoyaltyType;
  base: RoyaltyBase;
  percentage: number | null;
  fixedAmount: number | null;
  minRoyalty: number | null;
  maxRoyalty: number | null;
  tiers: { tierFrom: number; tierTo: number | null; rate: number }[];
};

/**
 * Salva a regra de royalty de um contrato: desativa a regra vigente,
 * cria uma nova ativa e (se escalonado) grava as faixas. Preserva o histórico.
 */
export async function saveRoyaltyRule(
  tenantId: string,
  contractId: string,
  currencyId: string | null,
  input: RoyaltyRuleFormInput,
) {
  // Segurança: o contrato precisa ser do tenant.
  const ctr = await db
    .select({ id: contract.id, currencyId: contract.currencyId })
    .from(contract)
    .where(and(eq(contract.id, contractId), eq(contract.tenantId, tenantId)))
    .limit(1);
  if (!ctr[0]) throw new Error("Contrato inválido.");

  await db
    .update(royaltyRule)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(royaltyRule.contractId, contractId),
        eq(royaltyRule.tenantId, tenantId),
        eq(royaltyRule.isActive, true),
      ),
    );

  const inserted = await db
    .insert(royaltyRule)
    .values({
      tenantId,
      contractId,
      royaltyType: input.royaltyType,
      base: input.base,
      percentage: input.percentage != null ? String(input.percentage) : null,
      fixedAmount: input.fixedAmount != null ? String(input.fixedAmount) : null,
      minRoyalty: input.minRoyalty != null ? String(input.minRoyalty) : null,
      maxRoyalty: input.maxRoyalty != null ? String(input.maxRoyalty) : null,
      currencyId: currencyId ?? ctr[0].currencyId,
      isActive: true,
    })
    .returning({ id: royaltyRule.id });
  const ruleId = inserted[0].id;

  if (input.royaltyType === "escalonado" && input.tiers.length) {
    const rows = input.tiers
      .filter((t) => Number.isFinite(t.tierFrom) && Number.isFinite(t.rate))
      .sort((a, b) => a.tierFrom - b.tierFrom)
      .map((t) => ({
        royaltyRuleId: ruleId,
        tierFrom: String(t.tierFrom),
        tierTo: t.tierTo != null ? String(t.tierTo) : null,
        rate: String(t.rate),
      }));
    if (rows.length) await db.insert(royaltyTier).values(rows);
  }

  return { ruleId };
}
