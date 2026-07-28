import "server-only";
import { and, eq, isNull, desc, count, asc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  supplier,
  country,
  purchaseOrder,
  supplierContact,
  supplierBankAccount,
  supplierPlant,
  supplierCertification,
  supplierAudit,
  supplierServedCategory,
  purchaseCategory,
} from "@/lib/db/schema";
import type { SupplierStatus, SupplierCategory, SupplierType } from "@/lib/db/schema";

/** Status considerados "aprovados/ativos" para KPIs. */
const ACTIVE_STATUSES: SupplierStatus[] = ["homologado", "condicional", "ativo"];

export async function listSuppliers(tenantId: string) {
  return db
    .select({
      id: supplier.id,
      code: supplier.code,
      legalName: supplier.legalName,
      tradeName: supplier.tradeName,
      category: supplier.category,
      supplierType: supplier.supplierType,
      status: supplier.status,
      rating: supplier.rating,
      leadTimeDays: supplier.leadTimeDays,
      city: supplier.city,
      countryName: country.name,
    })
    .from(supplier)
    .leftJoin(country, eq(country.id, supplier.countryId))
    .where(and(eq(supplier.tenantId, tenantId), isNull(supplier.deletedAt)))
    .orderBy(supplier.legalName)
    .limit(300);
}

export async function countActiveSuppliers(tenantId: string) {
  const rows = await db
    .select({ c: count() })
    .from(supplier)
    .where(
      and(
        eq(supplier.tenantId, tenantId),
        isNull(supplier.deletedAt),
        inArray(supplier.status, ACTIVE_STATUSES),
      ),
    );
  return rows[0]?.c ?? 0;
}

export async function getSupplierDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: supplier.id,
      code: supplier.code,
      legalName: supplier.legalName,
      tradeName: supplier.tradeName,
      category: supplier.category,
      supplierType: supplier.supplierType,
      economicGroup: supplier.economicGroup,
      cnpj: supplier.cnpj,
      stateRegistration: supplier.stateRegistration,
      status: supplier.status,
      rating: supplier.rating,
      leadTimeDays: supplier.leadTimeDays,
      moq: supplier.moq,
      capacity: supplier.capacity,
      incoterms: supplier.incoterms,
      currencies: supplier.currencies,
      paymentTerms: supplier.paymentTerms,
      email: supplier.email,
      phone: supplier.phone,
      website: supplier.website,
      address: supplier.address,
      stateProvince: supplier.stateProvince,
      city: supplier.city,
      countryName: country.name,
    })
    .from(supplier)
    .leftJoin(country, eq(country.id, supplier.countryId))
    .where(and(eq(supplier.id, id), eq(supplier.tenantId, tenantId)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;

  const [orders, contacts, banks, plants, certs, audits, served] = await Promise.all([
    db
      .select({
        id: purchaseOrder.id,
        poNumber: purchaseOrder.poNumber,
        status: purchaseOrder.status,
        totalAmount: purchaseOrder.totalAmount,
        orderDate: purchaseOrder.orderDate,
        expectedDate: purchaseOrder.expectedDate,
      })
      .from(purchaseOrder)
      .where(and(eq(purchaseOrder.supplierId, id), eq(purchaseOrder.tenantId, tenantId)))
      .orderBy(desc(purchaseOrder.orderDate)),
    db.select().from(supplierContact).where(eq(supplierContact.supplierId, id)).orderBy(desc(supplierContact.isPrimary)),
    db.select().from(supplierBankAccount).where(eq(supplierBankAccount.supplierId, id)),
    db.select().from(supplierPlant).where(eq(supplierPlant.supplierId, id)),
    db.select().from(supplierCertification).where(eq(supplierCertification.supplierId, id)).orderBy(asc(supplierCertification.validUntil)),
    db.select().from(supplierAudit).where(eq(supplierAudit.supplierId, id)).orderBy(desc(supplierAudit.auditDate)),
    db
      .select({ id: supplierServedCategory.id, categoryId: supplierServedCategory.purchaseCategoryId, name: purchaseCategory.name, code: purchaseCategory.code })
      .from(supplierServedCategory)
      .leftJoin(purchaseCategory, eq(purchaseCategory.id, supplierServedCategory.purchaseCategoryId))
      .where(eq(supplierServedCategory.supplierId, id)),
  ]);

  return { supplier: head, orders, contacts, banks, plants, certs, audits, served };
}

/* ---------------------------------------------------------------------------
 * Cadastro / edição
 * ------------------------------------------------------------------------- */

export async function listCountryOptions() {
  return db
    .select({ id: country.id, name: country.name, iso2: country.iso2 })
    .from(country)
    .orderBy(asc(country.name));
}

export async function listServedCategoryOptions(tenantId: string) {
  return db
    .select({ id: purchaseCategory.id, code: purchaseCategory.code, name: purchaseCategory.name })
    .from(purchaseCategory)
    .where(eq(purchaseCategory.tenantId, tenantId))
    .orderBy(asc(purchaseCategory.name));
}

export async function getSupplierForEdit(tenantId: string, id: string) {
  const rows = await db
    .select()
    .from(supplier)
    .where(and(eq(supplier.id, id), eq(supplier.tenantId, tenantId), isNull(supplier.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function setSupplierStatus(
  tenantId: string,
  id: string,
  status: SupplierStatus,
): Promise<void> {
  const exists = await db
    .select({ id: supplier.id })
    .from(supplier)
    .where(and(eq(supplier.id, id), eq(supplier.tenantId, tenantId), isNull(supplier.deletedAt)))
    .limit(1);
  if (!exists[0]) throw new Error("Fornecedor não encontrado.");
  await db
    .update(supplier)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(supplier.id, id), eq(supplier.tenantId, tenantId)));
}

export type SupplierInput = {
  code: string;
  legalName: string;
  tradeName: string | null;
  supplierType: SupplierType | null;
  economicGroup: string | null;
  cnpj: string | null;
  stateRegistration: string | null;
  category: SupplierCategory;
  countryId: string | null;
  stateProvince: string | null;
  city: string | null;
  address: string | null;
  website: string | null;
  capacity: string | null;
  moq: number | null;
  incoterms: string | null;
  currencies: string | null;
  status: SupplierStatus;
  rating: number | null;
  leadTimeDays: number | null;
  paymentTerms: string | null;
  email: string | null;
  phone: string | null;
};

async function assertCountry(countryId: string | null) {
  if (!countryId) return;
  const c = await db.select({ id: country.id }).from(country).where(eq(country.id, countryId)).limit(1);
  if (!c[0]) throw new Error("País inválido.");
}

function supplierValues(input: SupplierInput) {
  return {
    code: input.code,
    legalName: input.legalName,
    tradeName: input.tradeName,
    supplierType: input.supplierType,
    economicGroup: input.economicGroup,
    cnpj: input.cnpj,
    stateRegistration: input.stateRegistration,
    category: input.category,
    countryId: input.countryId,
    stateProvince: input.stateProvince,
    city: input.city,
    address: input.address,
    website: input.website,
    capacity: input.capacity,
    moq: input.moq,
    incoterms: input.incoterms,
    currencies: input.currencies,
    status: input.status,
    rating: input.rating != null ? String(input.rating) : null,
    leadTimeDays: input.leadTimeDays,
    paymentTerms: input.paymentTerms,
    email: input.email,
    phone: input.phone,
  };
}

export async function createSupplier(tenantId: string, input: SupplierInput): Promise<{ id: string }> {
  await assertCountry(input.countryId);
  const dup = await db
    .select({ id: supplier.id })
    .from(supplier)
    .where(and(eq(supplier.tenantId, tenantId), eq(supplier.code, input.code)))
    .limit(1);
  if (dup[0]) throw new Error(`Já existe um fornecedor com o código "${input.code}".`);
  const inserted = await db
    .insert(supplier)
    .values({ tenantId, ...supplierValues(input) })
    .returning({ id: supplier.id });
  return { id: inserted[0].id };
}

export async function updateSupplier(
  tenantId: string,
  id: string,
  input: SupplierInput,
): Promise<void> {
  const exists = await db
    .select({ id: supplier.id })
    .from(supplier)
    .where(and(eq(supplier.id, id), eq(supplier.tenantId, tenantId), isNull(supplier.deletedAt)))
    .limit(1);
  if (!exists[0]) throw new Error("Fornecedor não encontrado.");
  await assertCountry(input.countryId);
  const dup = await db
    .select({ id: supplier.id })
    .from(supplier)
    .where(and(eq(supplier.tenantId, tenantId), eq(supplier.code, input.code)))
    .limit(1);
  if (dup[0] && dup[0].id !== id)
    throw new Error(`Já existe outro fornecedor com o código "${input.code}".`);
  await db
    .update(supplier)
    .set({ ...supplierValues(input), updatedAt: new Date() })
    .where(and(eq(supplier.id, id), eq(supplier.tenantId, tenantId)));
}

/* ---------------------------------------------------------------------------
 * Sub-entidades (contatos, banco, plantas, certificações, auditorias, categorias)
 * ------------------------------------------------------------------------- */

async function assertSupplier(tenantId: string, supplierId: string) {
  const s = await db
    .select({ id: supplier.id })
    .from(supplier)
    .where(and(eq(supplier.id, supplierId), eq(supplier.tenantId, tenantId)))
    .limit(1);
  if (!s[0]) throw new Error("Fornecedor não encontrado.");
}

export async function addContact(
  tenantId: string,
  supplierId: string,
  v: { name: string; role: string | null; email: string | null; phone: string | null; isPrimary: boolean },
) {
  await assertSupplier(tenantId, supplierId);
  await db.insert(supplierContact).values({ tenantId, supplierId, ...v });
}

export async function addBankAccount(
  tenantId: string,
  supplierId: string,
  v: { bankName: string; agency: string | null; accountNumber: string | null; accountType: string | null; pixKey: string | null; swift: string | null; currency: string },
) {
  await assertSupplier(tenantId, supplierId);
  await db.insert(supplierBankAccount).values({ tenantId, supplierId, ...v });
}

export async function addPlant(
  tenantId: string,
  supplierId: string,
  v: { name: string; country: string | null; city: string | null; capacity: string | null; certifications: string | null },
) {
  await assertSupplier(tenantId, supplierId);
  await db.insert(supplierPlant).values({ tenantId, supplierId, ...v });
}

export async function addCertification(
  tenantId: string,
  supplierId: string,
  v: { name: string; number: string | null; issuer: string | null; issueDate: string | null; validUntil: string | null; status: string },
) {
  await assertSupplier(tenantId, supplierId);
  await db.insert(supplierCertification).values({ tenantId, supplierId, ...v });
}

export async function addAudit(
  tenantId: string,
  supplierId: string,
  v: { auditDate: string | null; auditType: string | null; result: string; score: number | null; auditor: string | null; findings: string | null },
) {
  await assertSupplier(tenantId, supplierId);
  await db.insert(supplierAudit).values({ tenantId, supplierId, ...v });
}

export async function setServedCategories(tenantId: string, supplierId: string, categoryIds: string[]) {
  await assertSupplier(tenantId, supplierId);
  await db
    .delete(supplierServedCategory)
    .where(and(eq(supplierServedCategory.tenantId, tenantId), eq(supplierServedCategory.supplierId, supplierId)));
  const clean = [...new Set(categoryIds.filter(Boolean))];
  if (clean.length)
    await db.insert(supplierServedCategory).values(clean.map((cid) => ({ tenantId, supplierId, purchaseCategoryId: cid })));
}

type SubTable = "contact" | "bank" | "plant" | "cert" | "audit" | "served";
const SUB_TABLES = {
  contact: supplierContact,
  bank: supplierBankAccount,
  plant: supplierPlant,
  cert: supplierCertification,
  audit: supplierAudit,
  served: supplierServedCategory,
} as const;

export async function deleteSubEntity(tenantId: string, table: SubTable, id: string) {
  const t = SUB_TABLES[table];
  await db.delete(t).where(and(eq(t.tenantId, tenantId), eq(t.id, id)));
}
