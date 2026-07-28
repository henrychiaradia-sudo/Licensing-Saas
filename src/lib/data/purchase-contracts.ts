import "server-only";
import { and, eq, asc, desc, sql, isNotNull, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { purchaseContract, purchaseOrder, supplier, supplyContract } from "@/lib/db/schema";
import type { PurchaseContractStatus } from "@/lib/db/schema";

/** Consumo por contrato de compra: soma dos pedidos vinculados (exceto cancelados). */
type Draw = { consumed: number; poCount: number };
async function drawdownByContract(tenantId: string): Promise<Map<string, Draw>> {
  const rows = await db
    .select({
      contractId: purchaseOrder.purchaseContractId,
      consumed: sql<string>`coalesce(sum(${purchaseOrder.totalAmount}) filter (where ${purchaseOrder.status} <> 'cancelado'), 0)`,
      poCount: sql<string>`count(*) filter (where ${purchaseOrder.status} <> 'cancelado')`,
    })
    .from(purchaseOrder)
    .where(and(eq(purchaseOrder.tenantId, tenantId), isNotNull(purchaseOrder.purchaseContractId)))
    .groupBy(purchaseOrder.purchaseContractId);
  const m = new Map<string, Draw>();
  for (const r of rows) {
    if (r.contractId) m.set(r.contractId, { consumed: Number(r.consumed), poCount: Number(r.poCount) });
  }
  return m;
}

export async function listPurchaseContracts(
  tenantId: string,
  opts?: { status?: PurchaseContractStatus; q?: string },
) {
  const conds = [eq(purchaseContract.tenantId, tenantId)];
  if (opts?.status) conds.push(eq(purchaseContract.status, opts.status));
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const m = or(ilike(purchaseContract.contractNumber, term), ilike(purchaseContract.title, term));
    if (m) conds.push(m);
  }
  const [rows, draw] = await Promise.all([
    db
      .select({
        id: purchaseContract.id,
        contractNumber: purchaseContract.contractNumber,
        title: purchaseContract.title,
        status: purchaseContract.status,
        currency: purchaseContract.currency,
        committedValue: purchaseContract.committedValue,
        startDate: purchaseContract.startDate,
        endDate: purchaseContract.endDate,
        supplierName: supplier.legalName,
      })
      .from(purchaseContract)
      .leftJoin(supplier, eq(supplier.id, purchaseContract.supplierId))
      .where(and(...conds))
      .orderBy(desc(purchaseContract.createdAt))
      .limit(300),
    drawdownByContract(tenantId),
  ]);
  return rows.map((c) => {
    const d = draw.get(c.id) ?? { consumed: 0, poCount: 0 };
    const committed = Number(c.committedValue);
    return {
      ...c,
      committed,
      consumed: d.consumed,
      available: committed - d.consumed,
      poCount: d.poCount,
      utilizationPct: committed > 0 ? Math.round((d.consumed / committed) * 100) : 0,
    };
  });
}

export async function purchaseContractSummary(tenantId: string) {
  const [rows, draw] = await Promise.all([
    db
      .select({
        id: purchaseContract.id,
        status: purchaseContract.status,
        committedValue: purchaseContract.committedValue,
      })
      .from(purchaseContract)
      .where(eq(purchaseContract.tenantId, tenantId)),
    drawdownByContract(tenantId),
  ]);
  const active = rows.filter((r) => r.status === "vigente");
  const committed = active.reduce((s, r) => s + Number(r.committedValue), 0);
  const consumed = active.reduce((s, r) => s + (draw.get(r.id)?.consumed ?? 0), 0);
  return {
    total: rows.length,
    active: active.length,
    committed,
    consumed,
    available: committed - consumed,
    utilizationPct: committed > 0 ? Math.round((consumed / committed) * 100) : 0,
  };
}

export async function getPurchaseContractDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: purchaseContract.id,
      contractNumber: purchaseContract.contractNumber,
      title: purchaseContract.title,
      status: purchaseContract.status,
      currency: purchaseContract.currency,
      committedValue: purchaseContract.committedValue,
      startDate: purchaseContract.startDate,
      endDate: purchaseContract.endDate,
      paymentTerms: purchaseContract.paymentTerms,
      notes: purchaseContract.notes,
      supplierId: purchaseContract.supplierId,
      supplierName: supplier.legalName,
      supplierCode: supplier.code,
      supplyContractNumber: supplyContract.contractNumber,
      supplyContractId: purchaseContract.supplyContractId,
    })
    .from(purchaseContract)
    .leftJoin(supplier, eq(supplier.id, purchaseContract.supplierId))
    .leftJoin(supplyContract, eq(supplyContract.id, purchaseContract.supplyContractId))
    .where(and(eq(purchaseContract.id, id), eq(purchaseContract.tenantId, tenantId)))
    .limit(1);
  const head = rows[0];
  if (!head) return null;

  const pos = await db
    .select({
      id: purchaseOrder.id,
      poNumber: purchaseOrder.poNumber,
      status: purchaseOrder.status,
      totalAmount: purchaseOrder.totalAmount,
      orderDate: purchaseOrder.orderDate,
    })
    .from(purchaseOrder)
    .where(
      and(eq(purchaseOrder.tenantId, tenantId), eq(purchaseOrder.purchaseContractId, id)),
    )
    .orderBy(desc(purchaseOrder.orderDate));

  const committed = Number(head.committedValue);
  const consumed = pos
    .filter((p) => p.status !== "cancelado")
    .reduce((s, p) => s + Number(p.totalAmount), 0);

  return {
    contract: head,
    pos,
    drawdown: {
      committed,
      consumed,
      available: committed - consumed,
      utilizationPct: committed > 0 ? Math.round((consumed / committed) * 100) : 0,
      poCount: pos.length,
    },
  };
}

/** Opções de contratos vigentes/rascunho para vincular a um pedido (com saldo). */
export async function listPurchaseContractOptions(tenantId: string) {
  const contracts = await listPurchaseContracts(tenantId);
  return contracts
    .filter((c) => c.status === "vigente" || c.status === "rascunho")
    .map((c) => ({
      id: c.id,
      contractNumber: c.contractNumber,
      title: c.title,
      supplierName: c.supplierName,
      available: c.available,
      currency: c.currency,
    }));
}

export async function listSupplyContractRefOptions(tenantId: string) {
  return db
    .select({
      id: supplyContract.id,
      contractNumber: supplyContract.contractNumber,
      title: supplyContract.title,
    })
    .from(supplyContract)
    .where(eq(supplyContract.tenantId, tenantId))
    .orderBy(desc(supplyContract.createdAt))
    .limit(200);
}

export type PurchaseContractInput = {
  title: string;
  supplierId: string;
  supplyContractId: string | null;
  status: PurchaseContractStatus;
  currency: string;
  committedValue: number;
  startDate: string | null;
  endDate: string | null;
  paymentTerms: string | null;
  notes: string | null;
};

export async function createPurchaseContract(
  tenantId: string,
  input: PurchaseContractInput,
  userId: string,
): Promise<{ id: string }> {
  const sup = await db
    .select({ id: supplier.id })
    .from(supplier)
    .where(and(eq(supplier.id, input.supplierId), eq(supplier.tenantId, tenantId)))
    .limit(1);
  if (!sup[0]) throw new Error("Fornecedor inválido.");

  const cnt = await db
    .select({ c: sql<string>`count(*)` })
    .from(purchaseContract)
    .where(eq(purchaseContract.tenantId, tenantId));
  const year = new Date().toISOString().slice(0, 4);
  const contractNumber = `PC-${year}-${String(Number(cnt[0]?.c ?? 0) + 1).padStart(4, "0")}`;

  const inserted = await db
    .insert(purchaseContract)
    .values({
      tenantId,
      contractNumber,
      title: input.title,
      supplierId: input.supplierId,
      supplyContractId: input.supplyContractId,
      status: input.status,
      currency: input.currency,
      committedValue: input.committedValue.toFixed(2),
      startDate: input.startDate,
      endDate: input.endDate,
      paymentTerms: input.paymentTerms,
      notes: input.notes,
      createdBy: userId,
    })
    .returning({ id: purchaseContract.id });
  return { id: inserted[0].id };
}

export async function setPurchaseContractStatus(
  tenantId: string,
  id: string,
  status: PurchaseContractStatus,
): Promise<void> {
  await db
    .update(purchaseContract)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(purchaseContract.id, id), eq(purchaseContract.tenantId, tenantId)));
}
