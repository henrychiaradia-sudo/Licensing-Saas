import "server-only";
import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { purchaseOrder, purchaseOrderItem, supplier, licensee, currency } from "@/lib/db/schema";

export async function listPurchaseOrders(tenantId: string) {
  return db
    .select({
      id: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      status: purchaseOrder.status,
      totalAmount: purchaseOrder.totalAmount,
      orderDate: purchaseOrder.orderDate,
      expectedDate: purchaseOrder.expectedDate,
      currencyIso: currency.isoCode,
      supplierName: supplier.legalName,
      licenseeName: licensee.legalName,
    })
    .from(purchaseOrder)
    .leftJoin(supplier, eq(supplier.id, purchaseOrder.supplierId))
    .leftJoin(licensee, eq(licensee.id, purchaseOrder.licenseeId))
    .leftJoin(currency, eq(currency.id, purchaseOrder.currencyId))
    .where(eq(purchaseOrder.tenantId, tenantId))
    .orderBy(desc(purchaseOrder.orderDate))
    .limit(200);
}

export async function getPurchaseOrderDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      status: purchaseOrder.status,
      totalAmount: purchaseOrder.totalAmount,
      orderDate: purchaseOrder.orderDate,
      expectedDate: purchaseOrder.expectedDate,
      receivedDate: purchaseOrder.receivedDate,
      incoterm: purchaseOrder.incoterm,
      notes: purchaseOrder.notes,
      currencyIso: currency.isoCode,
      supplierId: purchaseOrder.supplierId,
      supplierName: supplier.legalName,
      licenseeName: licensee.legalName,
    })
    .from(purchaseOrder)
    .leftJoin(supplier, eq(supplier.id, purchaseOrder.supplierId))
    .leftJoin(licensee, eq(licensee.id, purchaseOrder.licenseeId))
    .leftJoin(currency, eq(currency.id, purchaseOrder.currencyId))
    .where(and(eq(purchaseOrder.id, id), eq(purchaseOrder.tenantId, tenantId)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;

  const items = await db
    .select()
    .from(purchaseOrderItem)
    .where(eq(purchaseOrderItem.purchaseOrderId, id))
    .orderBy(desc(purchaseOrderItem.amount));

  return { order: head, items };
}

export async function purchaseSummary(tenantId: string) {
  const rows = await db
    .select({
      committed: sql<string>`coalesce(sum(${purchaseOrder.totalAmount}) filter (where ${purchaseOrder.status} not in ('rascunho','cancelado')), 0)`,
      received: sql<string>`coalesce(sum(${purchaseOrder.totalAmount}) filter (where ${purchaseOrder.status} = 'recebido'), 0)`,
      open: sql<string>`coalesce(sum(${purchaseOrder.totalAmount}) filter (where ${purchaseOrder.status} in ('enviado','confirmado','em_producao','embarcado')), 0)`,
    })
    .from(purchaseOrder)
    .where(eq(purchaseOrder.tenantId, tenantId));
  const r = rows[0];
  return {
    committed: Number(r?.committed ?? 0),
    received: Number(r?.received ?? 0),
    open: Number(r?.open ?? 0),
  };
}
