import "server-only";
import { and, eq, desc, asc, sql, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { shipment, shipmentEvent, supplier, purchaseOrder } from "@/lib/db/schema";
import type { ShipmentStatus } from "@/lib/db/schema";

export async function listShipments(
  tenantId: string,
  opts?: { status?: ShipmentStatus; q?: string },
) {
  const conds = [eq(shipment.tenantId, tenantId)];
  if (opts?.status) conds.push(eq(shipment.status, opts.status));
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const m = or(
      ilike(shipment.shipmentNumber, term),
      ilike(shipment.trackingCode, term),
      ilike(shipment.carrier, term),
    );
    if (m) conds.push(m);
  }
  return db
    .select({
      id: shipment.id,
      shipmentNumber: shipment.shipmentNumber,
      status: shipment.status,
      carrier: shipment.carrier,
      trackingCode: shipment.trackingCode,
      origin: shipment.origin,
      destination: shipment.destination,
      eta: shipment.eta,
      deliveredAt: shipment.deliveredAt,
      poNumber: purchaseOrder.poNumber,
      supplierName: supplier.legalName,
    })
    .from(shipment)
    .leftJoin(purchaseOrder, eq(purchaseOrder.id, shipment.purchaseOrderId))
    .leftJoin(supplier, eq(supplier.id, shipment.supplierId))
    .where(and(...conds))
    .orderBy(desc(shipment.createdAt))
    .limit(200);
}

export async function shipmentSummary(tenantId: string) {
  const r = await db
    .select({
      total: sql<string>`count(*)`,
      inTransit: sql<string>`count(*) filter (where ${shipment.status} in ('em_transito','desembaraco'))`,
      late: sql<string>`count(*) filter (where ${shipment.status} = 'atrasado')`,
      delivered: sql<string>`count(*) filter (where ${shipment.status} = 'entregue')`,
    })
    .from(shipment)
    .where(eq(shipment.tenantId, tenantId));
  return {
    total: Number(r[0]?.total ?? 0),
    inTransit: Number(r[0]?.inTransit ?? 0),
    late: Number(r[0]?.late ?? 0),
    delivered: Number(r[0]?.delivered ?? 0),
  };
}

export async function getShipmentDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: shipment.id,
      shipmentNumber: shipment.shipmentNumber,
      status: shipment.status,
      carrier: shipment.carrier,
      trackingCode: shipment.trackingCode,
      origin: shipment.origin,
      destination: shipment.destination,
      incoterm: shipment.incoterm,
      dispatchedAt: shipment.dispatchedAt,
      eta: shipment.eta,
      deliveredAt: shipment.deliveredAt,
      notes: shipment.notes,
      purchaseOrderId: shipment.purchaseOrderId,
      poNumber: purchaseOrder.poNumber,
      supplierId: shipment.supplierId,
      supplierName: supplier.legalName,
    })
    .from(shipment)
    .leftJoin(purchaseOrder, eq(purchaseOrder.id, shipment.purchaseOrderId))
    .leftJoin(supplier, eq(supplier.id, shipment.supplierId))
    .where(and(eq(shipment.id, id), eq(shipment.tenantId, tenantId)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;
  const events = await db
    .select()
    .from(shipmentEvent)
    .where(eq(shipmentEvent.shipmentId, id))
    .orderBy(desc(shipmentEvent.occurredAt));
  return { shipment: head, events };
}

export async function listShipmentsForPo(tenantId: string, purchaseOrderId: string) {
  return db
    .select({
      id: shipment.id,
      shipmentNumber: shipment.shipmentNumber,
      status: shipment.status,
      carrier: shipment.carrier,
      eta: shipment.eta,
      deliveredAt: shipment.deliveredAt,
    })
    .from(shipment)
    .where(and(eq(shipment.tenantId, tenantId), eq(shipment.purchaseOrderId, purchaseOrderId)))
    .orderBy(desc(shipment.createdAt));
}

export async function listPoOptionsForShipment(tenantId: string) {
  return db
    .select({
      id: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      supplierId: purchaseOrder.supplierId,
      supplierName: supplier.legalName,
    })
    .from(purchaseOrder)
    .leftJoin(supplier, eq(supplier.id, purchaseOrder.supplierId))
    .where(eq(purchaseOrder.tenantId, tenantId))
    .orderBy(desc(purchaseOrder.createdAt))
    .limit(200);
}

export type ShipmentInput = {
  purchaseOrderId: string | null;
  supplierId: string | null;
  carrier: string | null;
  trackingCode: string | null;
  status: ShipmentStatus;
  origin: string | null;
  destination: string | null;
  incoterm: string | null;
  dispatchedAt: string | null;
  eta: string | null;
  notes: string | null;
};

const statusLabel: Record<ShipmentStatus, string> = {
  preparacao: "Preparação",
  em_transito: "Em trânsito",
  desembaraco: "Desembaraço aduaneiro",
  entregue: "Entregue",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

export async function createShipment(
  tenantId: string,
  input: ShipmentInput,
  userId: string,
): Promise<{ id: string }> {
  // Se veio de um PO, herda o fornecedor do pedido quando não informado.
  let supplierId = input.supplierId;
  if (input.purchaseOrderId) {
    const po = await db
      .select({ id: purchaseOrder.id, supplierId: purchaseOrder.supplierId })
      .from(purchaseOrder)
      .where(and(eq(purchaseOrder.id, input.purchaseOrderId), eq(purchaseOrder.tenantId, tenantId)))
      .limit(1);
    if (!po[0]) throw new Error("Pedido de compra inválido.");
    if (!supplierId) supplierId = po[0].supplierId;
  }

  const cnt = await db
    .select({ c: sql<string>`count(*)` })
    .from(shipment)
    .where(eq(shipment.tenantId, tenantId));
  const year = new Date().toISOString().slice(0, 4);
  const shipmentNumber = `SHP-${year}-${String(Number(cnt[0]?.c ?? 0) + 1).padStart(4, "0")}`;

  const deliveredAt = input.status === "entregue" ? new Date().toISOString().slice(0, 10) : null;

  const inserted = await db
    .insert(shipment)
    .values({
      tenantId,
      shipmentNumber,
      purchaseOrderId: input.purchaseOrderId,
      supplierId,
      carrier: input.carrier,
      trackingCode: input.trackingCode,
      status: input.status,
      origin: input.origin,
      destination: input.destination,
      incoterm: input.incoterm,
      dispatchedAt: input.dispatchedAt,
      eta: input.eta,
      deliveredAt,
      notes: input.notes,
      createdBy: userId,
    })
    .returning({ id: shipment.id });

  await db.insert(shipmentEvent).values({
    tenantId,
    shipmentId: inserted[0].id,
    status: input.status,
    description: `Embarque criado — ${statusLabel[input.status]}`,
    location: input.origin,
    createdBy: userId,
  });

  return { id: inserted[0].id };
}

export async function setShipmentStatus(
  tenantId: string,
  id: string,
  status: ShipmentStatus,
  userId: string,
  location?: string | null,
): Promise<void> {
  const exists = await db
    .select({ id: shipment.id })
    .from(shipment)
    .where(and(eq(shipment.id, id), eq(shipment.tenantId, tenantId)))
    .limit(1);
  if (!exists[0]) throw new Error("Embarque não encontrado.");

  const patch: {
    status: ShipmentStatus;
    updatedAt: Date;
    deliveredAt?: string;
  } = { status, updatedAt: new Date() };
  if (status === "entregue") patch.deliveredAt = new Date().toISOString().slice(0, 10);

  await db
    .update(shipment)
    .set(patch)
    .where(and(eq(shipment.id, id), eq(shipment.tenantId, tenantId)));

  await db.insert(shipmentEvent).values({
    tenantId,
    shipmentId: id,
    status,
    description: statusLabel[status],
    location: location ?? null,
    createdBy: userId,
  });
}
