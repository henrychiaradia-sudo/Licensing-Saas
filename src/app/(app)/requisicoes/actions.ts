"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import {
  createRequisition,
  submitRequisition,
  decideRequisition,
  convertRequisitionToPo,
  type RequisitionInput,
} from "@/lib/data/requisitions";
import { logAudit } from "@/lib/data/audit";
import { requisitionSchema } from "./schema";

export type CreateReqResult = { ok: false; error: string };
export type FormState = { error: string | null };

export async function createRequisitionAction(input: unknown): Promise<CreateReqResult> {
  const session = await requireSession();
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
  const session = await requireSession();
  await submitRequisition(session.tenantId, id);
  revalidatePath(`/requisicoes/${id}`);
}

export async function decideRequisitionAction(id: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  const decision = String(formData.get("decision") ?? "");
  const comment = String(formData.get("comment") ?? "").trim() || null;
  if (decision !== "aprovada" && decision !== "reprovada") return;
  await decideRequisition(session.tenantId, id, decision, comment, session.userId);
  await logAudit(
    session.tenantId,
    session.userId,
    "requisition.decide",
    "purchase_requisition",
    id,
    `Requisição ${decision}${comment ? `: ${comment}` : ""}`,
  );
  revalidatePath(`/requisicoes/${id}`);
}

export async function convertRequisitionAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
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
