import "server-only";
import { and, eq, desc, sql, asc, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { purchaseOrder, purchaseOrderItem, supplier, licensee, currency } from "@/lib/db/schema";
import type { PoStatus } from "@/lib/db/schema";

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

/* ---------------------------------------------------------------------------
 * Criação de pedido de compra + itens
 * ------------------------------------------------------------------------- */

export async function listSupplierOptions(tenantId: string) {
  return db
    .select({
      id: supplier.id,
      legalName: supplier.legalName,
      tradeName: supplier.tradeName,
      code: supplier.code,
    })
    .from(supplier)
    .where(and(eq(supplier.tenantId, tenantId), isNull(supplier.deletedAt)))
    .orderBy(asc(supplier.legalName));
}

export type PurchaseOrderItemInput = {
  description: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
};

export type PurchaseOrderInput = {
  poNumber: string;
  supplierId: string;
  currencyId: string;
  licenseeId: string | null;
  status: PoStatus;
  orderDate: string | null;
  expectedDate: string | null;
  incoterm: string | null;
  notes: string | null;
  items: PurchaseOrderItemInput[];
};

export async function createPurchaseOrder(
  tenantId: string,
  input: PurchaseOrderInput,
): Promise<{ id: string }> {
  // Segurança: fornecedor, moeda e (se houver) licenciado precisam ser do tenant.
  const sup = await db
    .select({ id: supplier.id })
    .from(supplier)
    .where(and(eq(supplier.id, input.supplierId), eq(supplier.tenantId, tenantId)))
    .limit(1);
  if (!sup[0]) throw new Error("Fornecedor inválido.");
  const cur = await db
    .select({ id: currency.id })
    .from(currency)
    .where(eq(currency.id, input.currencyId))
    .limit(1);
  if (!cur[0]) throw new Error("Moeda inválida.");
  if (input.licenseeId) {
    const lic = await db
      .select({ id: licensee.id })
      .from(licensee)
      .where(and(eq(licensee.id, input.licenseeId), eq(licensee.tenantId, tenantId)))
      .limit(1);
    if (!lic[0]) throw new Error("Licenciado inválido.");
  }

  const dup = await db
    .select({ id: purchaseOrder.id })
    .from(purchaseOrder)
    .where(and(eq(purchaseOrder.tenantId, tenantId), eq(purchaseOrder.poNumber, input.poNumber)))
    .limit(1);
  if (dup[0]) throw new Error(`Já existe um pedido com o número "${input.poNumber}".`);

  const cleanItems = input.items
    .map((it) => ({
      description: it.description.trim(),
      sku: it.sku && it.sku.trim() ? it.sku.trim() : null,
      quantity: Number.isFinite(it.quantity) ? it.quantity : 0,
      unitPrice: Number.isFinite(it.unitPrice) ? it.unitPrice : 0,
    }))
    .filter((it) => it.description.length > 0);
  if (cleanItems.length === 0) throw new Error("Inclua ao menos um item no pedido.");

  const total = cleanItems.reduce((a, it) => a + it.quantity * it.unitPrice, 0);

  const inserted = await db
    .insert(purchaseOrder)
    .values({
      tenantId,
      poNumber: input.poNumber,
      supplierId: input.supplierId,
      licenseeId: input.licenseeId,
      currencyId: input.currencyId,
      status: input.status,
      totalAmount: total.toFixed(2),
      orderDate: input.orderDate,
      expectedDate: input.expectedDate,
      incoterm: input.incoterm,
      notes: input.notes,
    })
    .returning({ id: purchaseOrder.id });
  const poId = inserted[0].id;

  await db.insert(purchaseOrderItem).values(
    cleanItems.map((it) => ({
      tenantId,
      purchaseOrderId: poId,
      description: it.description,
      sku: it.sku,
      quantity: String(it.quantity),
      unitPrice: String(it.unitPrice),
      amount: (it.quantity * it.unitPrice).toFixed(2),
    })),
  );

  return { id: poId };
}

/** Fluxo de status do pedido de compra (ordem de avanço). */
export const PO_FLOW: PoStatus[] = [
  "rascunho",
  "enviado",
  "confirmado",
  "em_producao",
  "embarcado",
  "recebido",
];

export function nextPoStatus(current: PoStatus): PoStatus | null {
  const i = PO_FLOW.indexOf(current);
  if (i < 0 || i >= PO_FLOW.length - 1) return null;
  return PO_FLOW[i + 1];
}

/** Avança o pedido para um novo status válido (ou cancela). Grava a data de recebimento. */
export async function setPurchaseOrderStatus(
  tenantId: string,
  id: string,
  target: PoStatus,
): Promise<void> {
  const rows = await db
    .select({ id: purchaseOrder.id, status: purchaseOrder.status })
    .from(purchaseOrder)
    .where(and(eq(purchaseOrder.id, id), eq(purchaseOrder.tenantId, tenantId)))
    .limit(1);
  const po = rows[0];
  if (!po) throw new Error("Pedido não encontrado.");
  if (po.status === "recebido" || po.status === "cancelado")
    throw new Error("Este pedido já está finalizado.");

  const valid = target === "cancelado" || nextPoStatus(po.status) === target;
  if (!valid) throw new Error("Transição de status inválida.");

  const patch: { status: PoStatus; updatedAt: Date; receivedDate?: string } = {
    status: target,
    updatedAt: new Date(),
  };
  if (target === "recebido") patch.receivedDate = new Date().toISOString().slice(0, 10);

  await db
    .update(purchaseOrder)
    .set(patch)
    .where(and(eq(purchaseOrder.id, id), eq(purchaseOrder.tenantId, tenantId)));
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
