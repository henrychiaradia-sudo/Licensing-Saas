import "server-only";
import { and, eq, desc, sql, inArray, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  purchaseRequisition,
  purchaseRequisitionItem,
  appUser,
} from "@/lib/db/schema";
import type { PurchaseRequisitionStatus } from "@/lib/db/schema";
import { createPurchaseOrder } from "./purchase-orders";
import { purchaseOrder } from "@/lib/db/schema";

export async function listRequisitions(
  tenantId: string,
  opts?: { status?: PurchaseRequisitionStatus },
) {
  const conds = [eq(purchaseRequisition.tenantId, tenantId)];
  if (opts?.status) conds.push(eq(purchaseRequisition.status, opts.status));
  const reqs = await db
    .select({
      id: purchaseRequisition.id,
      requisitionNumber: purchaseRequisition.requisitionNumber,
      title: purchaseRequisition.title,
      status: purchaseRequisition.status,
      neededBy: purchaseRequisition.neededBy,
      createdAt: purchaseRequisition.createdAt,
    })
    .from(purchaseRequisition)
    .where(and(...conds))
    .orderBy(desc(purchaseRequisition.createdAt))
    .limit(200);
  if (!reqs.length) return [];
  const ids = reqs.map((r) => r.id);
  const agg = await db
    .select({
      reqId: purchaseRequisitionItem.purchaseRequisitionId,
      cnt: sql<string>`count(*)`,
      total: sql<string>`coalesce(sum(${purchaseRequisitionItem.quantity} * ${purchaseRequisitionItem.estimatedUnitPrice}), 0)`,
    })
    .from(purchaseRequisitionItem)
    .where(inArray(purchaseRequisitionItem.purchaseRequisitionId, ids))
    .groupBy(purchaseRequisitionItem.purchaseRequisitionId);
  return reqs.map((r) => {
    const a = agg.find((x) => x.reqId === r.id);
    return {
      ...r,
      itemCount: Number(a?.cnt ?? 0),
      estimatedTotal: Number(a?.total ?? 0),
    };
  });
}

export async function getRequisitionDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: purchaseRequisition.id,
      requisitionNumber: purchaseRequisition.requisitionNumber,
      title: purchaseRequisition.title,
      justification: purchaseRequisition.justification,
      status: purchaseRequisition.status,
      neededBy: purchaseRequisition.neededBy,
      decisionComment: purchaseRequisition.decisionComment,
      decidedAt: purchaseRequisition.decidedAt,
      convertedPoId: purchaseRequisition.convertedPoId,
      requesterName: appUser.name,
    })
    .from(purchaseRequisition)
    .leftJoin(appUser, eq(appUser.id, purchaseRequisition.requesterUserId))
    .where(and(eq(purchaseRequisition.id, id), eq(purchaseRequisition.tenantId, tenantId)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;

  const items = await db
    .select()
    .from(purchaseRequisitionItem)
    .where(eq(purchaseRequisitionItem.purchaseRequisitionId, id))
    .orderBy(asc(purchaseRequisitionItem.createdAt));

  let convertedPoNumber: string | null = null;
  if (head.convertedPoId) {
    const po = await db
      .select({ poNumber: purchaseOrder.poNumber })
      .from(purchaseOrder)
      .where(eq(purchaseOrder.id, head.convertedPoId))
      .limit(1);
    convertedPoNumber = po[0]?.poNumber ?? null;
  }

  return { requisition: head, items, convertedPoNumber };
}

export type RequisitionItemInput = {
  description: string;
  sku: string | null;
  quantity: number;
  estimatedUnitPrice: number;
};
export type RequisitionInput = {
  title: string;
  justification: string | null;
  neededBy: string | null;
  status: PurchaseRequisitionStatus;
  items: RequisitionItemInput[];
};

export async function createRequisition(
  tenantId: string,
  input: RequisitionInput,
  userId: string,
): Promise<{ id: string }> {
  const clean = input.items
    .map((it) => ({
      description: it.description.trim(),
      sku: it.sku && it.sku.trim() ? it.sku.trim() : null,
      quantity: Number.isFinite(it.quantity) ? it.quantity : 0,
      estimatedUnitPrice: Number.isFinite(it.estimatedUnitPrice) ? it.estimatedUnitPrice : 0,
    }))
    .filter((it) => it.description.length > 0);
  if (clean.length === 0) throw new Error("Inclua ao menos um item na requisição.");

  const cnt = await db
    .select({ c: sql<string>`count(*)` })
    .from(purchaseRequisition)
    .where(eq(purchaseRequisition.tenantId, tenantId));
  const year = new Date().toISOString().slice(0, 4);
  const requisitionNumber = `REQ-${year}-${String(Number(cnt[0]?.c ?? 0) + 1).padStart(4, "0")}`;

  const inserted = await db
    .insert(purchaseRequisition)
    .values({
      tenantId,
      requisitionNumber,
      title: input.title,
      justification: input.justification,
      requesterUserId: userId,
      status: input.status,
      neededBy: input.neededBy,
    })
    .returning({ id: purchaseRequisition.id });
  const reqId = inserted[0].id;

  await db.insert(purchaseRequisitionItem).values(
    clean.map((it) => ({
      tenantId,
      purchaseRequisitionId: reqId,
      description: it.description,
      sku: it.sku,
      quantity: String(it.quantity),
      estimatedUnitPrice: String(it.estimatedUnitPrice),
    })),
  );
  return { id: reqId };
}

async function loadReq(tenantId: string, id: string) {
  const rows = await db
    .select({ id: purchaseRequisition.id, status: purchaseRequisition.status })
    .from(purchaseRequisition)
    .where(and(eq(purchaseRequisition.id, id), eq(purchaseRequisition.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function submitRequisition(tenantId: string, id: string): Promise<void> {
  const req = await loadReq(tenantId, id);
  if (!req) throw new Error("Requisição não encontrada.");
  if (req.status !== "rascunho") throw new Error("Só é possível enviar requisições em rascunho.");
  await db
    .update(purchaseRequisition)
    .set({ status: "enviada", updatedAt: new Date() })
    .where(and(eq(purchaseRequisition.id, id), eq(purchaseRequisition.tenantId, tenantId)));
}

export async function decideRequisition(
  tenantId: string,
  id: string,
  decision: "aprovada" | "reprovada",
  comment: string | null,
  userId: string,
): Promise<void> {
  const req = await loadReq(tenantId, id);
  if (!req) throw new Error("Requisição não encontrada.");
  if (req.status !== "enviada")
    throw new Error("Só é possível decidir requisições enviadas para aprovação.");
  await db
    .update(purchaseRequisition)
    .set({
      status: decision,
      decidedBy: userId,
      decidedAt: new Date(),
      decisionComment: comment,
      updatedAt: new Date(),
    })
    .where(and(eq(purchaseRequisition.id, id), eq(purchaseRequisition.tenantId, tenantId)));
}

/** Converte uma requisição aprovada num pedido de compra (com os itens da requisição). */
export async function convertRequisitionToPo(
  tenantId: string,
  id: string,
  input: { supplierId: string; currencyId: string },
): Promise<{ poId: string; poNumber: string }> {
  const req = await loadReq(tenantId, id);
  if (!req) throw new Error("Requisição não encontrada.");
  if (req.status !== "aprovada")
    throw new Error("Só é possível gerar pedido de uma requisição aprovada.");

  const items = await db
    .select()
    .from(purchaseRequisitionItem)
    .where(eq(purchaseRequisitionItem.purchaseRequisitionId, id));
  if (!items.length) throw new Error("Requisição sem itens.");

  const cnt = await db
    .select({ c: sql<string>`count(*)` })
    .from(purchaseOrder)
    .where(eq(purchaseOrder.tenantId, tenantId));
  const year = new Date().toISOString().slice(0, 4);
  const poNumber = `PO-${year}-${String(8000 + Number(cnt[0]?.c ?? 0) + 1).padStart(4, "0")}`;

  const res = await createPurchaseOrder(tenantId, {
    poNumber,
    supplierId: input.supplierId,
    currencyId: input.currencyId,
    licenseeId: null,
    status: "rascunho",
    orderDate: new Date().toISOString().slice(0, 10),
    expectedDate: null,
    incoterm: null,
    notes: `Gerado da requisição ${id}`,
    items: items.map((it) => ({
      description: it.description,
      sku: it.sku,
      quantity: Number(it.quantity),
      unitPrice: Number(it.estimatedUnitPrice),
    })),
  });

  await db
    .update(purchaseRequisition)
    .set({ status: "convertida", convertedPoId: res.id, updatedAt: new Date() })
    .where(and(eq(purchaseRequisition.id, id), eq(purchaseRequisition.tenantId, tenantId)));

  return { poId: res.id, poNumber };
}
