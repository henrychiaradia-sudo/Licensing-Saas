import "server-only";
import { and, eq, isNull, desc, count, asc, inArray, or, ilike } from "drizzle-orm";
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
import type { ContractStatus, ExclusivityType } from "@/lib/db/schema";

export async function listContracts(
  tenantId: string,
  opts?: { status?: ContractStatus; q?: string },
) {
  const conds = [eq(contract.tenantId, tenantId), isNull(contract.deletedAt)];
  if (opts?.status) conds.push(eq(contract.status, opts.status));
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const match = or(ilike(contract.contractNumber, term), ilike(licensee.legalName, term));
    if (match) conds.push(match);
  }
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
    .where(and(...conds))
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

/* ---------------------------------------------------------------------------
 * Cadastro / edição de contratos
 * ------------------------------------------------------------------------- */

/** Licenciados ativos para o seletor do formulário de contrato. */
export async function listLicenseeOptions(tenantId: string) {
  return db
    .select({ id: licensee.id, legalName: licensee.legalName })
    .from(licensee)
    .where(and(eq(licensee.tenantId, tenantId), isNull(licensee.deletedAt)))
    .orderBy(asc(licensee.legalName));
}

/** Moedas disponíveis para o seletor. */
export async function listCurrencyOptions() {
  return db
    .select({ id: currency.id, isoCode: currency.isoCode, name: currency.name })
    .from(currency)
    .orderBy(asc(currency.isoCode));
}

/** Marcas ativas do tenant para vincular ao contrato. */
export async function listBrandOptions(tenantId: string) {
  return db
    .select({ id: brand.id, name: brand.name, code: brand.code })
    .from(brand)
    .where(and(eq(brand.tenantId, tenantId), isNull(brand.deletedAt)))
    .orderBy(asc(brand.name));
}

/** Dados de um contrato para preencher o formulário de edição (+ marcas vinculadas). */
export async function getContractForEdit(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: contract.id,
      contractNumber: contract.contractNumber,
      licenseeId: contract.licenseeId,
      currencyId: contract.currencyId,
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
    })
    .from(contract)
    .where(and(eq(contract.id, id), eq(contract.tenantId, tenantId), isNull(contract.deletedAt)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;
  const brandRows = await db
    .select({ brandId: contractBrand.brandId })
    .from(contractBrand)
    .where(eq(contractBrand.contractId, id));
  return { ...head, brandIds: brandRows.map((b) => b.brandId) };
}

export type ContractInput = {
  contractNumber: string;
  licenseeId: string;
  currencyId: string;
  status: ContractStatus;
  exclusivity: ExclusivityType;
  signingDate: string | null;
  startDate: string | null;
  endDate: string | null;
  autoRenewal: boolean;
  renewalTermMonths: number | null;
  minimumGuaranteeTotal: number | null;
  insuranceRequired: boolean;
  insuranceInfo: string | null;
  notes: string | null;
  brandIds: string[];
};

async function assertRefsBelongToTenant(tenantId: string, input: ContractInput) {
  const lic = await db
    .select({ id: licensee.id })
    .from(licensee)
    .where(and(eq(licensee.id, input.licenseeId), eq(licensee.tenantId, tenantId)))
    .limit(1);
  if (!lic[0]) throw new Error("Licenciado inválido.");
  const cur = await db
    .select({ id: currency.id })
    .from(currency)
    .where(eq(currency.id, input.currencyId))
    .limit(1);
  if (!cur[0]) throw new Error("Moeda inválida.");
  if (input.brandIds.length) {
    const ok = await db
      .select({ id: brand.id })
      .from(brand)
      .where(and(eq(brand.tenantId, tenantId), inArray(brand.id, input.brandIds)));
    if (ok.length !== input.brandIds.length) throw new Error("Marca inválida no vínculo.");
  }
}

async function replaceContractBrands(contractId: string, brandIds: string[]) {
  await db.delete(contractBrand).where(eq(contractBrand.contractId, contractId));
  if (brandIds.length) {
    await db
      .insert(contractBrand)
      .values(brandIds.map((brandId) => ({ contractId, brandId })));
  }
}

/** Cria um novo contrato e vincula as marcas selecionadas. */
export async function createContract(
  tenantId: string,
  input: ContractInput,
  userId: string,
): Promise<{ id: string }> {
  await assertRefsBelongToTenant(tenantId, input);

  // Número de contrato único por tenant.
  const dup = await db
    .select({ id: contract.id })
    .from(contract)
    .where(and(eq(contract.tenantId, tenantId), eq(contract.contractNumber, input.contractNumber)))
    .limit(1);
  if (dup[0]) throw new Error(`Já existe um contrato com o número "${input.contractNumber}".`);

  const inserted = await db
    .insert(contract)
    .values({
      tenantId,
      contractNumber: input.contractNumber,
      licenseeId: input.licenseeId,
      currencyId: input.currencyId,
      status: input.status,
      exclusivity: input.exclusivity,
      signingDate: input.signingDate,
      startDate: input.startDate,
      endDate: input.endDate,
      autoRenewal: input.autoRenewal,
      renewalTermMonths: input.renewalTermMonths,
      minimumGuaranteeTotal:
        input.minimumGuaranteeTotal != null ? String(input.minimumGuaranteeTotal) : null,
      insuranceRequired: input.insuranceRequired,
      insuranceInfo: input.insuranceInfo,
      notes: input.notes,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning({ id: contract.id });
  const id = inserted[0].id;
  await replaceContractBrands(id, input.brandIds);
  return { id };
}

/** Atualiza um contrato existente e refaz o vínculo de marcas. */
export async function updateContract(
  tenantId: string,
  id: string,
  input: ContractInput,
  userId: string,
): Promise<void> {
  const exists = await db
    .select({ id: contract.id })
    .from(contract)
    .where(and(eq(contract.id, id), eq(contract.tenantId, tenantId), isNull(contract.deletedAt)))
    .limit(1);
  if (!exists[0]) throw new Error("Contrato não encontrado.");
  await assertRefsBelongToTenant(tenantId, input);

  const dup = await db
    .select({ id: contract.id })
    .from(contract)
    .where(and(eq(contract.tenantId, tenantId), eq(contract.contractNumber, input.contractNumber)))
    .limit(1);
  if (dup[0] && dup[0].id !== id)
    throw new Error(`Já existe outro contrato com o número "${input.contractNumber}".`);

  await db
    .update(contract)
    .set({
      contractNumber: input.contractNumber,
      licenseeId: input.licenseeId,
      currencyId: input.currencyId,
      status: input.status,
      exclusivity: input.exclusivity,
      signingDate: input.signingDate,
      startDate: input.startDate,
      endDate: input.endDate,
      autoRenewal: input.autoRenewal,
      renewalTermMonths: input.renewalTermMonths,
      minimumGuaranteeTotal:
        input.minimumGuaranteeTotal != null ? String(input.minimumGuaranteeTotal) : null,
      insuranceRequired: input.insuranceRequired,
      insuranceInfo: input.insuranceInfo,
      notes: input.notes,
      updatedBy: userId,
      updatedAt: new Date(),
    })
    .where(and(eq(contract.id, id), eq(contract.tenantId, tenantId)));
  await replaceContractBrands(id, input.brandIds);
}
