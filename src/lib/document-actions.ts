"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireInternal, requireLicenseeSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { logAudit } from "@/lib/data/audit";
import type { SessionData } from "@/lib/session";
import {
  generateContractDocument,
  generateRoyaltyDocument,
  sendForSignature,
  cancelDocument,
  signDocument,
  getDocumentMeta,
} from "@/lib/data/generated-documents";

function canManageDocs(session: SessionData): boolean {
  return (
    can(session, PERMISSIONS.contractWrite) ||
    can(session, PERMISSIONS.royaltyApprove) ||
    can(session, PERMISSIONS.royaltyValidate) ||
    can(session, PERMISSIONS.royaltySubmit)
  );
}

async function requestMeta(): Promise<{ ip: string | null; ua: string | null }> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const ua = h.get("user-agent") || null;
  return { ip, ua };
}

/* --------------------------------- internas ------------------------------- */

export async function generateContractDocumentAction(contractId: string): Promise<void> {
  const session = await requireInternal();
  if (!canManageDocs(session)) return;
  const { id } = await generateContractDocument(session.tenantId, contractId, session.userId);
  await logAudit(
    session.tenantId,
    session.userId,
    "document.generate",
    "generated_document",
    id,
    "Contrato gerado em PDF",
  );
  revalidatePath(`/contratos/${contractId}`);
  revalidatePath("/documentos-gerados");
}

export async function generateRoyaltyDocumentAction(reportId: string): Promise<void> {
  const session = await requireInternal();
  if (!canManageDocs(session)) return;
  const { id } = await generateRoyaltyDocument(session.tenantId, reportId, session.userId);
  await logAudit(
    session.tenantId,
    session.userId,
    "document.generate",
    "generated_document",
    id,
    "Extrato de royalties gerado em PDF",
  );
  revalidatePath(`/royalties/${reportId}`);
  revalidatePath("/documentos-gerados");
}

export async function sendForSignatureAction(id: string): Promise<void> {
  const session = await requireInternal();
  if (!canManageDocs(session)) return;
  const meta = await getDocumentMeta(session.tenantId, id);
  const res = await sendForSignature(session.tenantId, id);
  if (res.ok) {
    await logAudit(
      session.tenantId,
      session.userId,
      "document.send",
      "generated_document",
      id,
      "Documento enviado para assinatura",
    );
  }
  revalidateForSource(meta?.sourceType, meta?.sourceId);
}

export async function cancelDocumentAction(id: string): Promise<void> {
  const session = await requireInternal();
  if (!canManageDocs(session)) return;
  const meta = await getDocumentMeta(session.tenantId, id);
  const res = await cancelDocument(session.tenantId, id);
  if (res.ok) {
    await logAudit(
      session.tenantId,
      session.userId,
      "document.cancel",
      "generated_document",
      id,
      "Documento cancelado",
    );
  }
  revalidateForSource(meta?.sourceType, meta?.sourceId);
}

function revalidateForSource(sourceType?: string, sourceId?: string) {
  revalidatePath("/documentos-gerados");
  if (sourceType === "contract" && sourceId) revalidatePath(`/contratos/${sourceId}`);
  if (sourceType === "royalty_report" && sourceId) revalidatePath(`/royalties/${sourceId}`);
}

/* ------------------------ portal: assinatura eletrônica ------------------- */

export type SignState = { ok?: boolean; error?: string; code?: string };

export async function signDocumentAction(
  id: string,
  _prev: SignState,
  formData: FormData,
): Promise<SignState> {
  const session = await requireLicenseeSession();

  const signerName = String(formData.get("signerName") ?? "").trim();
  const signerCpf = String(formData.get("signerCpf") ?? "").trim();
  const signerEmail = String(formData.get("signerEmail") ?? "").trim() || session.email;
  const aceite = formData.get("aceite");

  if (signerName.length < 3) return { error: "Informe o nome completo do signatário." };
  if (signerCpf.replace(/\D/g, "").length !== 11) return { error: "Informe um CPF válido (11 dígitos)." };
  if (!aceite) return { error: "É necessário marcar o aceite para assinar." };

  const { ip, ua } = await requestMeta();
  const res = await signDocument({
    tenantId: session.tenantId,
    licenseeId: session.licenseeId,
    id,
    signerName,
    signerCpf,
    signerEmail,
    ip,
    userAgent: ua,
  });
  if (!res.ok) return { error: res.error ?? "Falha ao assinar." };

  await logAudit(
    session.tenantId,
    session.userId,
    "document.sign",
    "generated_document",
    id,
    `Documento assinado eletronicamente por ${signerName}`,
  );
  revalidatePath("/portal/documentos");
  revalidatePath(`/portal/documentos/${id}`);
  return { ok: true, code: res.code };
}
