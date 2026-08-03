import "server-only";
import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { scopeConds, type ViewScope } from "@/lib/view";
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
import type { PaymentMethod } from "@/lib/db/schema";

export async function listReceivables(tenantId: string, opts?: { licenseeId?: string }) {
  const conds = [eq(receivable.tenantId, tenantId)];
  if (opts?.licenseeId) conds.push(eq(receivable.licenseeId, opts.licenseeId));
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
    .where(and(...conds))
    .orderBy(receivable.dueDate)
    .limit(200);
}

export async function listInvoices(tenantId: string, opts?: { licenseeId?: string }) {
  const conds = [eq(invoice.tenantId, tenantId)];
  if (opts?.licenseeId) conds.push(eq(invoice.licenseeId, opts.licenseeId));
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
    .where(and(...conds))
    .orderBy(desc(invoice.issueDate))
    .limit(200);
}

export async function listPayments(tenantId: string, opts?: { licenseeId?: string }) {
  const conds = [eq(payment.tenantId, tenantId)];
  if (opts?.licenseeId) conds.push(eq(receivable.licenseeId, opts.licenseeId));
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
    .where(and(...conds))
    .orderBy(desc(payment.paidAt))
    .limit(200);
}

export async function listLedger(tenantId: string, opts?: { licenseeId?: string }) {
  const conds = [eq(ledgerEntry.tenantId, tenantId)];
  if (opts?.licenseeId) conds.push(eq(ledgerEntry.licenseeId, opts.licenseeId));
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
    .where(and(...conds))
    .orderBy(desc(ledgerEntry.entryDate))
    .limit(50);
}

export async function financeSummary(tenantId: string, scope?: ViewScope) {
  const rows = await db
    .select({
      outstanding: sql<string>`coalesce(sum(${receivable.amount} - ${receivable.paidAmount}) filter (where ${receivable.status} not in ('pago', 'cancelado')), 0)`,
      received: sql<string>`coalesce(sum(${receivable.paidAmount}), 0)`,
      overdue: sql<string>`coalesce(sum(${receivable.amount} - ${receivable.paidAmount}) filter (where ${receivable.status} not in ('pago','cancelado') and ${receivable.dueDate} < current_date), 0)`,
    })
    .from(receivable)
    .where(
      and(
        eq(receivable.tenantId, tenantId),
        ...scopeConds(scope, { licensee: receivable.licenseeId, contract: receivable.contractId }),
      ),
    );
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

/**
 * Recoupment da garantia mínima de um contrato: quanto dos royalties apurados
 * (aprovados) já recuperou a GM, o saldo a recuperar e o excedente.
 */
export async function getContractRecoupment(tenantId: string, contractId: string) {
  const ctr = await db
    .select({ mgTotal: contract.minimumGuaranteeTotal })
    .from(contract)
    .where(and(eq(contract.id, contractId), eq(contract.tenantId, tenantId)))
    .limit(1);
  const mg = await db
    .select({ total: sql<string>`coalesce(sum(${minimumGuarantee.amount}), 0)` })
    .from(minimumGuarantee)
    .where(and(eq(minimumGuarantee.tenantId, tenantId), eq(minimumGuarantee.contractId, contractId)));
  const roy = await db
    .select({ total: sql<string>`coalesce(sum(${royaltyReport.royaltyCalculated}), 0)` })
    .from(royaltyReport)
    .where(
      and(
        eq(royaltyReport.tenantId, tenantId),
        eq(royaltyReport.contractId, contractId),
        eq(royaltyReport.status, "aprovado"),
      ),
    );
  const mgRows = Number(mg[0]?.total ?? 0);
  const gmTotal = mgRows > 0 ? mgRows : Number(ctr[0]?.mgTotal ?? 0);
  const earned = Number(roy[0]?.total ?? 0);
  const recouped = Math.min(earned, gmTotal);
  const outstanding = Math.max(0, gmTotal - earned);
  const surplus = Math.max(0, earned - gmTotal);
  const pct = gmTotal > 0 ? Math.min(100, Math.round((earned / gmTotal) * 100)) : 0;
  return { gmTotal, earned, recouped, outstanding, surplus, pct };
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

/** Detalhe de um recebível + seus pagamentos. */
export async function getReceivableDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: receivable.id,
      description: receivable.description,
      amount: receivable.amount,
      paidAmount: receivable.paidAmount,
      status: receivable.status,
      dueDate: receivable.dueDate,
      currencyId: receivable.currencyId,
      currencyIso: currency.isoCode,
      licenseeName: licensee.legalName,
      contractNumber: contract.contractNumber,
    })
    .from(receivable)
    .leftJoin(currency, eq(currency.id, receivable.currencyId))
    .leftJoin(licensee, eq(licensee.id, receivable.licenseeId))
    .leftJoin(contract, eq(contract.id, receivable.contractId))
    .where(and(eq(receivable.id, id), eq(receivable.tenantId, tenantId)))
    .limit(1);
  const rec = rows[0];
  if (!rec) return null;

  const payments = await db
    .select({
      id: payment.id,
      method: payment.method,
      amount: payment.amount,
      paidAt: payment.paidAt,
      reference: payment.reference,
    })
    .from(payment)
    .where(and(eq(payment.receivableId, id), eq(payment.tenantId, tenantId)))
    .orderBy(desc(payment.paidAt));

  return { receivable: rec, payments };
}

/** Registra um pagamento (parcial ou total) num recebível, com método e data. */
export async function registerPaymentDetailed(
  tenantId: string,
  receivableId: string,
  input: { amount: number; method: PaymentMethod; paidAt: string; reference?: string | null },
) {
  const rows = await db
    .select()
    .from(receivable)
    .where(and(eq(receivable.id, receivableId), eq(receivable.tenantId, tenantId)))
    .limit(1);
  const rec = rows[0];
  if (!rec) throw new Error("Recebível não encontrado.");
  const outstanding = Number(rec.amount) - Number(rec.paidAmount);
  if (outstanding <= 0) throw new Error("Este recebível já está quitado.");

  const amount = Math.min(Math.max(0, input.amount), outstanding);
  if (amount <= 0) throw new Error("Informe um valor de pagamento válido.");

  await db.insert(payment).values({
    tenantId,
    receivableId,
    method: input.method,
    amount: String(amount),
    currencyId: rec.currencyId,
    paidAt: new Date(input.paidAt + "T12:00:00Z"),
    reference: input.reference || null,
  });

  const newPaid = Number(rec.paidAmount) + amount;
  const fullyPaid = newPaid >= Number(rec.amount) - 0.005;
  await db
    .update(receivable)
    .set({
      paidAmount: String(newPaid),
      status: fullyPaid ? "pago" : "parcial",
      updatedAt: new Date(),
    })
    .where(and(eq(receivable.id, receivableId), eq(receivable.tenantId, tenantId)));
}
