import "server-only";
import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  receivable,
  invoice,
  payment,
  ledgerEntry,
  minimumGuarantee,
  royaltyReport,
  licensee,
  currency,
  contract,
} from "@/lib/db/schema";

export async function listReceivables(tenantId: string) {
  return db
    .select({
      id: receivable.id,
      description: receivable.description,
      amount: receivable.amount,
      paidAmount: receivable.paidAmount,
      status: receivable.status,
      dueDate: receivable.dueDate,
      currencyIso: currency.isoCode,
      licenseeName: licensee.legalName,
      contractNumber: contract.contractNumber,
    })
    .from(receivable)
    .leftJoin(licensee, eq(licensee.id, receivable.licenseeId))
    .leftJoin(currency, eq(currency.id, receivable.currencyId))
    .leftJoin(contract, eq(contract.id, receivable.contractId))
    .where(eq(receivable.tenantId, tenantId))
    .orderBy(receivable.dueDate)
    .limit(200);
}

export async function listInvoices(tenantId: string) {
  return db
    .select({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      grossAmount: invoice.grossAmount,
      netAmount: invoice.netAmount,
      status: invoice.status,
      currencyIso: currency.isoCode,
      licenseeName: licensee.legalName,
    })
    .from(invoice)
    .leftJoin(licensee, eq(licensee.id, invoice.licenseeId))
    .leftJoin(currency, eq(currency.id, invoice.currencyId))
    .where(eq(invoice.tenantId, tenantId))
    .orderBy(desc(invoice.issueDate))
    .limit(200);
}

export async function listPayments(tenantId: string) {
  return db
    .select({
      id: payment.id,
      method: payment.method,
      amount: payment.amount,
      paidAt: payment.paidAt,
      reference: payment.reference,
      currencyIso: currency.isoCode,
      description: receivable.description,
      licenseeName: licensee.legalName,
    })
    .from(payment)
    .leftJoin(receivable, eq(receivable.id, payment.receivableId))
    .leftJoin(licensee, eq(licensee.id, receivable.licenseeId))
    .leftJoin(currency, eq(currency.id, payment.currencyId))
    .where(eq(payment.tenantId, tenantId))
    .orderBy(desc(payment.paidAt))
    .limit(200);
}

export async function listLedger(tenantId: string) {
  return db
    .select({
      id: ledgerEntry.id,
      entryType: ledgerEntry.entryType,
      amount: ledgerEntry.amount,
      entryDate: ledgerEntry.entryDate,
      description: ledgerEntry.description,
      currencyIso: currency.isoCode,
      licenseeName: licensee.legalName,
    })
    .from(ledgerEntry)
    .leftJoin(licensee, eq(licensee.id, ledgerEntry.licenseeId))
    .leftJoin(currency, eq(currency.id, ledgerEntry.currencyId))
    .where(eq(ledgerEntry.tenantId, tenantId))
    .orderBy(desc(ledgerEntry.entryDate))
    .limit(50);
}

export async function financeSummary(tenantId: string) {
  const rows = await db
    .select({
      outstanding: sql<string>`coalesce(sum(${receivable.amount} - ${receivable.paidAmount}) filter (where ${receivable.status} not in ('pago', 'cancelado')), 0)`,
      received: sql<string>`coalesce(sum(${receivable.paidAmount}), 0)`,
      overdue: sql<string>`coalesce(sum(${receivable.amount} - ${receivable.paidAmount}) filter (where ${receivable.status} = 'vencido'), 0)`,
    })
    .from(receivable)
    .where(eq(receivable.tenantId, tenantId));
  const r = rows[0];
  return {
    outstanding: Number(r?.outstanding ?? 0),
    received: Number(r?.received ?? 0),
    overdue: Number(r?.overdue ?? 0),
  };
}

/** % da garantia mínima já coberta pelos royalties calculados (KPI do dashboard). */
export async function mgRealizedPercent(tenantId: string) {
  const mg = await db
    .select({ total: sql<string>`coalesce(sum(${minimumGuarantee.amount}), 0)` })
    .from(minimumGuarantee)
    .where(eq(minimumGuarantee.tenantId, tenantId));
  const roy = await db
    .select({ total: sql<string>`coalesce(sum(${royaltyReport.royaltyCalculated}), 0)` })
    .from(royaltyReport)
    .where(eq(royaltyReport.tenantId, tenantId));
  const mgTotal = Number(mg[0]?.total ?? 0);
  const royTotal = Number(roy[0]?.total ?? 0);
  if (mgTotal <= 0) return 0;
  return Math.min(100, Math.round((royTotal / mgTotal) * 100));
}

/** Registra o pagamento integral em aberto de um recebível (baixa manual). */
export async function registerPayment(tenantId: string, receivableId: string) {
  const rows = await db
    .select()
    .from(receivable)
    .where(and(eq(receivable.id, receivableId), eq(receivable.tenantId, tenantId)))
    .limit(1);
  const rec = rows[0];
  if (!rec) return;
  const outstanding = Number(rec.amount) - Number(rec.paidAmount);
  if (outstanding <= 0) return;

  await db.insert(payment).values({
    tenantId,
    receivableId,
    method: "pix",
    amount: String(outstanding),
    currencyId: rec.currencyId,
    paidAt: new Date(),
    reference: "Baixa manual",
  });

  await db
    .update(receivable)
    .set({ paidAmount: String(Number(rec.amount)), status: "pago", updatedAt: new Date() })
    .where(and(eq(receivable.id, receivableId), eq(receivable.tenantId, tenantId)));
}
