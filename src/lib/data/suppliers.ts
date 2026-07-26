import "server-only";
import { and, eq, isNull, desc, count, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { supplier, country, purchaseOrder } from "@/lib/db/schema";
import type { SupplierStatus, SupplierCategory } from "@/lib/db/schema";

export async function listSuppliers(tenantId: string) {
  return db
    .select({
      id: supplier.id,
      code: supplier.code,
      legalName: supplier.legalName,
      tradeName: supplier.tradeName,
      category: supplier.category,
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
    .limit(200);
}

export async function countActiveSuppliers(tenantId: string) {
  const rows = await db
    .select({ c: count() })
    .from(supplier)
    .where(
      and(eq(supplier.tenantId, tenantId), isNull(supplier.deletedAt), eq(supplier.status, "ativo")),
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
      status: supplier.status,
      rating: supplier.rating,
      leadTimeDays: supplier.leadTimeDays,
      paymentTerms: supplier.paymentTerms,
      email: supplier.email,
      phone: supplier.phone,
      city: supplier.city,
      countryName: country.name,
    })
    .from(supplier)
    .leftJoin(country, eq(country.id, supplier.countryId))
    .where(and(eq(supplier.id, id), eq(supplier.tenantId, tenantId)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;

  const orders = await db
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
    .orderBy(desc(purchaseOrder.orderDate));

  return { supplier: head, orders };
}

/* ---------------------------------------------------------------------------
 * Cadastro / edição de fornecedores
 * ------------------------------------------------------------------------- */

export async function listCountryOptions() {
  return db
    .select({ id: country.id, name: country.name, iso2: country.iso2 })
    .from(country)
    .orderBy(asc(country.name));
}

export async function getSupplierForEdit(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: supplier.id,
      code: supplier.code,
      legalName: supplier.legalName,
      tradeName: supplier.tradeName,
      category: supplier.category,
      countryId: supplier.countryId,
      city: supplier.city,
      status: supplier.status,
      rating: supplier.rating,
      leadTimeDays: supplier.leadTimeDays,
      paymentTerms: supplier.paymentTerms,
      email: supplier.email,
      phone: supplier.phone,
    })
    .from(supplier)
    .where(and(eq(supplier.id, id), eq(supplier.tenantId, tenantId), isNull(supplier.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export type SupplierInput = {
  code: string;
  legalName: string;
  tradeName: string | null;
  category: SupplierCategory;
  countryId: string | null;
  city: string | null;
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
    .values({
      tenantId,
      code: input.code,
      legalName: input.legalName,
      tradeName: input.tradeName,
      category: input.category,
      countryId: input.countryId,
      city: input.city,
      status: input.status,
      rating: input.rating != null ? String(input.rating) : null,
      leadTimeDays: input.leadTimeDays,
      paymentTerms: input.paymentTerms,
      email: input.email,
      phone: input.phone,
    })
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
    .set({
      code: input.code,
      legalName: input.legalName,
      tradeName: input.tradeName,
      category: input.category,
      countryId: input.countryId,
      city: input.city,
      status: input.status,
      rating: input.rating != null ? String(input.rating) : null,
      leadTimeDays: input.leadTimeDays,
      paymentTerms: input.paymentTerms,
      email: input.email,
      phone: input.phone,
      updatedAt: new Date(),
    })
    .where(and(eq(supplier.id, id), eq(supplier.tenantId, tenantId)));
}
