import "server-only";
import { and, eq, isNull, desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  contract,
  contractFee,
  minimumGuarantee,
  contractTerritory,
  contractBrand,
  contractAlert,
  contractDocument,
  licensee,
  currency,
  brand,
  territory,
} from "@/lib/db/schema";

export async function listContracts(tenantId: string) {
  return db
    .select({
      id: contract.id,
      contractNumber: contract.contractNumber,
      status: contract.status,
      exclusivity: contract.exclusivity,
      startDate: contract.startDate,
      endDate: contract.endDate,
      autoRenewal: contract.autoRenewal,
      minimumGuaranteeTotal: contract.minimumGuaranteeTotal,
      currencyIso: currency.isoCode,
      licenseeName: licensee.legalName,
    })
    .from(contract)
    .leftJoin(licensee, eq(licensee.id, contract.licenseeId))
    .leftJoin(currency, eq(currency.id, contract.currencyId))
    .where(and(eq(contract.tenantId, tenantId), isNull(contract.deletedAt)))
    .orderBy(desc(contract.startDate))
    .limit(200);
}

export async function countActiveContracts(tenantId: string) {
  const rows = await db
    .select({ c: count() })
    .from(contract)
    .where(
      and(
        eq(contract.tenantId, tenantId),
        isNull(contract.deletedAt),
        eq(contract.status, "vigente"),
      ),
    );
  return rows[0]?.c ?? 0;
}

export async function getContractDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: contract.id,
      contractNumber: contract.contractNumber,
      status: contract.status,
      exclusivity: contract.exclusivity,
      signingDate: contract.signingDate,
      startDate: contract.startDate,
      endDate: contract.endDate,
      autoRenewal: contract.autoRenewal,
      renewalTermMonths: contract.renewalTermMonths,
      minimumGuaranteeTotal: contract.minimumGuaranteeTotal,
      insuranceRequired: contract.insuranceRequired,
      insuranceInfo: contract.insuranceInfo,
      notes: contract.notes,
      currencyIso: currency.isoCode,
      licenseeId: contract.licenseeId,
      licenseeName: licensee.legalName,
    })
    .from(contract)
    .leftJoin(licensee, eq(licensee.id, contract.licenseeId))
    .leftJoin(currency, eq(currency.id, contract.currencyId))
    .where(and(eq(contract.id, id), eq(contract.tenantId, tenantId)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;

  const fees = await db
    .select({
      id: contractFee.id,
      feeType: contractFee.feeType,
      amount: contractFee.amount,
      dueDate: contractFee.dueDate,
      recurrence: contractFee.recurrence,
      note: contractFee.note,
      currencyIso: currency.isoCode,
    })
    .from(contractFee)
    .leftJoin(currency, eq(currency.id, contractFee.currencyId))
    .where(eq(contractFee.contractId, id))
    .orderBy(contractFee.dueDate);

  const guarantees = await db
    .select({
      id: minimumGuarantee.id,
      periodStart: minimumGuarantee.periodStart,
      periodEnd: minimumGuarantee.periodEnd,
      amount: minimumGuarantee.amount,
      note: minimumGuarantee.note,
      currencyIso: currency.isoCode,
    })
    .from(minimumGuarantee)
    .leftJoin(currency, eq(currency.id, minimumGuarantee.currencyId))
    .where(eq(minimumGuarantee.contractId, id))
    .orderBy(minimumGuarantee.periodStart);

  const territories = await db
    .select({
      name: territory.name,
      kind: territory.kind,
      isExclusive: contractTerritory.isExclusive,
    })
    .from(contractTerritory)
    .leftJoin(territory, eq(territory.id, contractTerritory.territoryId))
    .where(eq(contractTerritory.contractId, id));

  const brands = await db
    .select({ id: brand.id, name: brand.name, code: brand.code })
    .from(contractBrand)
    .leftJoin(brand, eq(brand.id, contractBrand.brandId))
    .where(eq(contractBrand.contractId, id));

  const alerts = await db
    .select({
      id: contractAlert.id,
      alertType: contractAlert.alertType,
      triggerDate: contractAlert.triggerDate,
      status: contractAlert.status,
      channel: contractAlert.channel,
      daysBefore: contractAlert.daysBefore,
    })
    .from(contractAlert)
    .where(eq(contractAlert.contractId, id))
    .orderBy(contractAlert.triggerDate);

  const documents = await db
    .select({
      id: contractDocument.id,
      docType: contractDocument.docType,
      fileName: contractDocument.fileName,
      version: contractDocument.version,
      isSigned: contractDocument.isSigned,
      uploadedAt: contractDocument.uploadedAt,
    })
    .from(contractDocument)
    .where(eq(contractDocument.contractId, id))
    .orderBy(desc(contractDocument.uploadedAt));

  return { contract: head, fees, guarantees, territories, brands, alerts, documents };
}
