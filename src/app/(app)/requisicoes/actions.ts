"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireInternal, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  createRequisition,
  submitRequisition,
  convertRequisitionToPo,
  type RequisitionInput,
} from "@/lib/data/requisitions";
import { generateApprovalSteps, decideCurrentStep } from "@/lib/data/approvals";
import { logAudit } from "@/lib/data/audit";
import { requisitionSchema } from "./schema";

export type CreateReqResult = { ok: false; error: string };
export type FormState = { error: string | null };

export async function createRequisitionAction(input: unknown): Promise<CreateReqResult> {
  const session = await requireInternal();
  if (!can(session, PERMISSIONS.requisitionWrite)) {
    return { ok: false, error: "Você não tem permissão para criar requisições." };
  }
  const parsed = requisitionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;
  const reqInput: RequisitionInput = {
    title: d.title,
    justification: d.justification || null,
    neededBy: d.neededBy || null,
    status: d.status,
    items: d.items.map((it) => ({
      description: it.description,
      sku: it.sku || null,
      quantity: it.quantity,
      estimatedUnitPrice: it.estimatedUnitPrice,
    })),
  };
  let id: string;
  try {
    id = (await createRequisition(session.tenantId, reqInput, session.userId)).id;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Não foi possível criar a requisição." };
  }
  redirect(`/requisicoes/${id}`);
}

export async function submitRequisitionAction(id: string): Promise<void> {
  const session = await requireInternal();
  if (!can(session, PERMISSIONS.requisitionWrite)) return;
  await submitRequisition(session.tenantId, id);
  await generateApprovalSteps(session.tenantId, id);
  revalidatePath(`/requisicoes/${id}`);
  revalidatePath(`/aprovacoes`);
}

export async function decideRequisitionAction(id: string, formData: FormData): Promise<void> {
  const session = await requireInternal();
  if (!can(session, PERMISSIONS.requisitionApprove)) return;
  const decision = String(formData.get("decision") ?? "");
  const comment = String(formData.get("comment") ?? "").trim() || null;
  if (decision !== "aprovada" && decision !== "reprovada") return;
  const res = await decideCurrentStep(session.tenantId, id, decision, comment, session.userId);
  await logAudit(
    session.tenantId,
    session.userId,
    "requisition.approval.step",
    "purchase_requisition",
    id,
    `${res.tierLabel}: ${decision}${res.final ? ` (requisição ${res.final})` : " (avança nível)"}${comment ? ` — ${comment}` : ""}`,
  );
  revalidatePath(`/requisicoes/${id}`);
  revalidatePath(`/aprovacoes`);
}

export async function convertRequisitionAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireInternal();
  if (!can(session, PERMISSIONS.purchaseWrite)) {
    return { error: "Você não tem permissão para gerar pedidos de compra." };
  }
  const supplierId = String(formData.get("supplierId") ?? "");
  const currencyId = String(formData.get("currencyId") ?? "");
  if (!supplierId || !currencyId) return { error: "Selecione fornecedor e moeda." };
  let poId: string;
  try {
    poId = (await convertRequisitionToPo(session.tenantId, id, { supplierId, currencyId })).poId;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível gerar o pedido." };
  }
  await logAudit(
    session.tenantId,
    session.userId,
    "requisition.convert",
    "purchase_requisition",
    id,
    "Requisição convertida em pedido de compra",
  );
  redirect(`/compras/${poId}`);
}
