import "server-only";
import { and, eq, desc, sql, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  royaltyReport,
  product,
  productApproval,
  approvalStage,
  contractAlert,
  contract,
  licensee,
  receivable,
  currency,
} from "@/lib/db/schema";

/** Itens que pedem ação do time interno: reportes a aprovar, produtos a revisar, alertas de contrato. */
export async function getInternalPendencias(tenantId: string) {
  const reports = await db
    .select({
      id: royaltyReport.id,
      referenceLabel: royaltyReport.referenceLabel,
      status: royaltyReport.status,
      royaltyCalculated: royaltyReport.royaltyCalculated,
      currencyIso: currency.isoCode,
      licenseeName: licensee.legalName,
      contractNumber: contract.contractNumber,
    })
    .from(royaltyReport)
    .leftJoin(licensee, eq(licensee.id, royaltyReport.licenseeId))
    .leftJoin(contract, eq(contract.id, royaltyReport.contractId))
    .leftJoin(currency, eq(currency.id, royaltyReport.currencyId))
    .where(
      and(
        eq(royaltyReport.tenantId, tenantId),
        sql`${royaltyReport.status} in ('enviado','com_divergencia')`,
      ),
    )
    .orderBy(desc(royaltyReport.submittedAt))
    .limit(20);

  const productsRaw = await db
    .select({
      id: product.id,
      sku: product.sku,
      name: product.name,
      status: product.status,
      licenseeName: licensee.legalName,
      approvalId: productApproval.id,
    })
    .from(product)
    .leftJoin(licensee, eq(licensee.id, product.licenseeId))
    .leftJoin(
      productApproval,
      and(eq(productApproval.productId, product.id), eq(productApproval.version, product.currentVersion)),
    )
    .where(
      and(
        eq(product.tenantId, tenantId),
        isNull(product.deletedAt),
        sql`${product.status} in ('submetido','em_aprovacao')`,
      ),
    )
    .orderBy(desc(product.updatedAt))
    .limit(30);

  const apprIds = productsRaw.map((p) => p.approvalId).filter((x): x is string => Boolean(x));
  const pendingMap = new Map<string, number>();
  if (apprIds.length) {
    const c = await db
      .select({
        approvalId: approvalStage.productApprovalId,
        pend: sql<number>`count(*) filter (where ${approvalStage.decision} = 'pendente')::int`,
      })
      .from(approvalStage)
      .where(inArray(approvalStage.productApprovalId, apprIds))
      .groupBy(approvalStage.productApprovalId);
    for (const r of c) pendingMap.set(r.approvalId, r.pend);
  }
  const products = productsRaw
    .map((p) => ({ ...p, pending: p.approvalId ? pendingMap.get(p.approvalId) ?? 0 : 0 }))
    .filter((p) => p.pending > 0)
    .slice(0, 20);

  const alerts = await db
    .select({
      id: contractAlert.id,
      alertType: contractAlert.alertType,
      status: contractAlert.status,
      triggerDate: contractAlert.triggerDate,
      contractId: contractAlert.contractId,
      contractNumber: contract.contractNumber,
      licenseeName: licensee.legalName,
    })
    .from(contractAlert)
    .leftJoin(contract, eq(contract.id, contractAlert.contractId))
    .leftJoin(licensee, eq(licensee.id, contract.licenseeId))
    .where(
      and(
        eq(contractAlert.tenantId, tenantId),
        sql`${contractAlert.status} in ('agendado','disparado')`,
      ),
    )
    .orderBy(contractAlert.triggerDate)
    .limit(20);

  return { reports, products, alerts };
}

/** Pendências do licenciado: produtos reprovados (reenviar), reportes com divergência, recebíveis vencidos. */
export async function getLicenseePendencias(tenantId: string, licenseeId: string) {
  const reprovedProducts = await db
    .select({ id: product.id, sku: product.sku, name: product.name })
    .from(product)
    .where(
      and(
        eq(product.tenantId, tenantId),
        eq(product.licenseeId, licenseeId),
        eq(product.status, "reprovado"),
        isNull(product.deletedAt),
      ),
    )
    .orderBy(desc(product.updatedAt))
    .limit(20);

  const divergentReports = await db
    .select({ id: royaltyReport.id, referenceLabel: royaltyReport.referenceLabel })
    .from(royaltyReport)
    .where(
      and(
        eq(royaltyReport.tenantId, tenantId),
        eq(royaltyReport.licenseeId, licenseeId),
        eq(royaltyReport.status, "com_divergencia"),
      ),
    )
    .orderBy(desc(royaltyReport.periodStart))
    .limit(20);

  const overdue = await db
    .select({
      id: receivable.id,
      description: receivable.description,
      amount: receivable.amount,
      paidAmount: receivable.paidAmount,
      dueDate: receivable.dueDate,
      status: receivable.status,
      currencyIso: currency.isoCode,
    })
    .from(receivable)
    .leftJoin(currency, eq(currency.id, receivable.currencyId))
    .where(
      and(
        eq(receivable.tenantId, tenantId),
        eq(receivable.licenseeId, licenseeId),
        sql`${receivable.status} not in ('pago','cancelado')`,
        sql`(${receivable.status} = 'vencido' or ${receivable.dueDate} < current_date)`,
      ),
    )
    .orderBy(receivable.dueDate)
    .limit(20);

  return { reprovedProducts, divergentReports, overdue };
}
