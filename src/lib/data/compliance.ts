import "server-only";
import { and, eq, isNull, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contract,
  licensee,
  royaltyReport,
  receivable,
  contractDocument,
  contractAlert,
  supplier,
  currency,
} from "@/lib/db/schema";

export async function getComplianceSignals(tenantId: string) {
  const expiringContracts = await db
    .select({
      id: contract.id,
      contractNumber: contract.contractNumber,
      endDate: contract.endDate,
      licenseeName: licensee.legalName,
      mg: contract.minimumGuaranteeTotal,
      currencyIso: currency.isoCode,
    })
    .from(contract)
    .leftJoin(licensee, eq(licensee.id, contract.licenseeId))
    .leftJoin(currency, eq(currency.id, contract.currencyId))
    .where(
      and(
        eq(contract.tenantId, tenantId),
        isNull(contract.deletedAt),
        eq(contract.status, "vigente"),
        sql`${contract.endDate} <= current_date + interval '120 days'`,
      ),
    )
    .orderBy(contract.endDate);

  const divergentReports = await db
    .select({
      id: royaltyReport.id,
      referenceLabel: royaltyReport.referenceLabel,
      variance: royaltyReport.variance,
      licenseeName: licensee.legalName,
      currencyIso: currency.isoCode,
    })
    .from(royaltyReport)
    .leftJoin(licensee, eq(licensee.id, royaltyReport.licenseeId))
    .leftJoin(currency, eq(currency.id, royaltyReport.currencyId))
    .where(and(eq(royaltyReport.tenantId, tenantId), eq(royaltyReport.status, "com_divergencia")))
    .orderBy(desc(royaltyReport.variance));

  const overdueReceivables = await db
    .select({
      id: receivable.id,
      description: receivable.description,
      dueDate: receivable.dueDate,
      amount: receivable.amount,
      paidAmount: receivable.paidAmount,
      status: receivable.status,
      licenseeName: licensee.legalName,
      currencyIso: currency.isoCode,
    })
    .from(receivable)
    .leftJoin(licensee, eq(licensee.id, receivable.licenseeId))
    .leftJoin(currency, eq(currency.id, receivable.currencyId))
    .where(
      and(
        eq(receivable.tenantId, tenantId),
        sql`${receivable.status} not in ('pago', 'cancelado')`,
        sql`${receivable.dueDate} <= current_date + interval '30 days'`,
      ),
    )
    .orderBy(receivable.dueDate);

  const unsignedDocs = await db
    .select({
      id: contractDocument.id,
      fileName: contractDocument.fileName,
      docType: contractDocument.docType,
      contractNumber: contract.contractNumber,
    })
    .from(contractDocument)
    .leftJoin(contract, eq(contract.id, contractDocument.contractId))
    .where(and(eq(contractDocument.tenantId, tenantId), eq(contractDocument.isSigned, false)))
    .limit(50);

  const pendingAlerts = await db
    .select({
      id: contractAlert.id,
      alertType: contractAlert.alertType,
      triggerDate: contractAlert.triggerDate,
      status: contractAlert.status,
      contractNumber: contract.contractNumber,
    })
    .from(contractAlert)
    .leftJoin(contract, eq(contract.id, contractAlert.contractId))
    .where(
      and(
        eq(contractAlert.tenantId, tenantId),
        sql`${contractAlert.status} in ('agendado', 'disparado')`,
      ),
    )
    .orderBy(contractAlert.triggerDate);

  const pendingSuppliers = await db
    .select({
      id: supplier.id,
      legalName: supplier.legalName,
      category: supplier.category,
    })
    .from(supplier)
    .where(
      and(
        eq(supplier.tenantId, tenantId),
        eq(supplier.status, "em_homologacao"),
        isNull(supplier.deletedAt),
      ),
    );

  return {
    expiringContracts,
    divergentReports,
    overdueReceivables,
    unsignedDocs,
    pendingAlerts,
    pendingSuppliers,
  };
}
