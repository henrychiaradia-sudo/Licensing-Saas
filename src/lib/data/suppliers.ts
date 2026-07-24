import "server-only";
import { and, eq, isNull, desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { supplier, country, purchaseOrder } from "@/lib/db/schema";

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
