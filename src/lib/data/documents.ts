import "server-only";
import { and, eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { supplier, supplierDocument } from "@/lib/db/schema";
import type { SupplierDocType, SupplierDocStatus } from "@/lib/db/schema";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function assertSupplier(tenantId: string, supplierId: string) {
  const s = await db
    .select({ id: supplier.id })
    .from(supplier)
    .where(and(eq(supplier.id, supplierId), eq(supplier.tenantId, tenantId)))
    .limit(1);
  if (!s[0]) throw new Error("Fornecedor não encontrado.");
}

export type DocumentInput = {
  docType: SupplierDocType;
  name: string | null;
  number: string | null;
  issuer: string | null;
  issueDate: string | null;
  validUntil: string | null;
  fileName: string | null;
  responsible: string | null;
  notes: string | null;
};

export async function listSupplierDocuments(tenantId: string, supplierId: string) {
  return db
    .select()
    .from(supplierDocument)
    .where(and(eq(supplierDocument.tenantId, tenantId), eq(supplierDocument.supplierId, supplierId)))
    .orderBy(asc(supplierDocument.validUntil));
}

export async function addDocument(tenantId: string, supplierId: string, input: DocumentInput) {
  await assertSupplier(tenantId, supplierId);
  await db.insert(supplierDocument).values({
    tenantId,
    supplierId,
    docType: input.docType,
    name: input.name,
    number: input.number,
    issuer: input.issuer,
    issueDate: input.issueDate,
    validUntil: input.validUntil,
    fileName: input.fileName,
    responsible: input.responsible,
    notes: input.notes,
    status: "pendente",
  });
}

export async function setDocumentStatus(
  tenantId: string,
  id: string,
  status: SupplierDocStatus,
  approvedBy: string | null,
): Promise<void> {
  const exists = await db
    .select({ id: supplierDocument.id })
    .from(supplierDocument)
    .where(and(eq(supplierDocument.id, id), eq(supplierDocument.tenantId, tenantId)))
    .limit(1);
  if (!exists[0]) throw new Error("Documento não encontrado.");

  const patch: {
    status: SupplierDocStatus;
    updatedAt: Date;
    approvedBy?: string | null;
    approvedAt?: string | null;
  } = { status, updatedAt: new Date() };

  if (status === "aprovado") {
    patch.approvedBy = approvedBy;
    patch.approvedAt = today();
  } else {
    patch.approvedBy = null;
    patch.approvedAt = null;
  }

  await db
    .update(supplierDocument)
    .set(patch)
    .where(and(eq(supplierDocument.id, id), eq(supplierDocument.tenantId, tenantId)));
}

export async function deleteDocument(tenantId: string, id: string): Promise<void> {
  await db
    .delete(supplierDocument)
    .where(and(eq(supplierDocument.id, id), eq(supplierDocument.tenantId, tenantId)));
}

/** Todos os documentos do tenant com nome do fornecedor — usado na visão global de alertas. */
export async function listDocumentAlerts(tenantId: string) {
  return db
    .select({
      id: supplierDocument.id,
      supplierId: supplierDocument.supplierId,
      supplierLegalName: supplier.legalName,
      supplierTradeName: supplier.tradeName,
      docType: supplierDocument.docType,
      name: supplierDocument.name,
      number: supplierDocument.number,
      issuer: supplierDocument.issuer,
      validUntil: supplierDocument.validUntil,
      status: supplierDocument.status,
      responsible: supplierDocument.responsible,
      approvedBy: supplierDocument.approvedBy,
    })
    .from(supplierDocument)
    .leftJoin(supplier, eq(supplier.id, supplierDocument.supplierId))
    .where(eq(supplierDocument.tenantId, tenantId))
    .orderBy(asc(supplierDocument.validUntil))
    .limit(500);
}
