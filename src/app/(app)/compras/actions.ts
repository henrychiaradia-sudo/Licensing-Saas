"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import {
  createPurchaseOrder,
  setPurchaseOrderStatus,
  receivePurchaseOrder,
  approvePurchaseOrder,
  type PurchaseOrderInput,
} from "@/lib/data/purchase-orders";
import { logAudit } from "@/lib/data/audit";
import { purchaseOrderSchema } from "./schema";
import type { PoStatus } from "@/lib/db/schema";

export type CreatePoResult = { ok: false; error: string };

export async function createPurchaseOrderAction(input: unknown): Promise<CreatePoResult> {
  const session = await requireSession();

  const parsed = purchaseOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  const poInput: PurchaseOrderInput = {
    poNumber: d.poNumber,
    supplierId: d.supplierId,
    currencyId: d.currencyId,
    licenseeId: d.licenseeId ? d.licenseeId : null,
    status: d.status,
    orderDate: d.orderDate || null,
    expectedDate: d.expectedDate || null,
    incoterm: d.incoterm || null,
    notes: d.notes || null,
    purchaseContractId: d.purchaseContractId ? d.purchaseContractId : null,
    purchaseCategoryId: d.purchaseCategoryId ? d.purchaseCategoryId : null,
    items: d.items.map((it) => ({
      description: it.description,
      sku: it.sku || null,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    })),
  };

  let poId: string;
  try {
    const res = await createPurchaseOrder(session.tenantId, poInput);
    poId = res.id;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Não foi possível criar o pedido." };
  }

  await logAudit(
    session.tenantId,
    session.userId,
    "purchase_order.create",
    "purchase_order",
    poId,
    `Pedido ${poInput.poNumber} criado`,
  );

  redirect(`/compras/${poId}`);
}

export async function setPoStatusAction(id: string, target: PoStatus): Promise<void> {
  const session = await requireSession();
  await setPurchaseOrderStatus(session.tenantId, id, target);
  await logAudit(
    session.tenantId,
    session.userId,
    "purchase_order.status",
    "purchase_order",
    id,
    `Status do pedido → ${target}`,
  );
  revalidatePath(`/compras/${id}`);
  revalidatePath("/compras");
}

export async function approvePoAction(id: string): Promise<void> {
  const session = await requireSession();
  await approvePurchaseOrder(session.tenantId, id, session.userId);
  await logAudit(
    session.tenantId,
    session.userId,
    "purchase_order.approve",
    "purchase_order",
    id,
    "Pedido aprovado por alçada",
  );
  revalidatePath(`/compras/${id}`);
  revalidatePath("/compras");
}

export async function receivePoAction(id: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  const receipts: { itemId: string; receivedQty: number }[] = [];
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("qty_")) {
      const n = Number(String(v).replace(",", "."));
      receipts.push({ itemId: k.slice(4), receivedQty: Number.isFinite(n) ? n : 0 });
    }
  }
  await receivePurchaseOrder(session.tenantId, id, receipts);
  await logAudit(
    session.tenantId,
    session.userId,
    "purchase_order.receive",
    "purchase_order",
    id,
    `Recebimento registrado (${receipts.length} item(ns))`,
  );
  revalidatePath(`/compras/${id}`);
  revalidatePath("/compras");
}
