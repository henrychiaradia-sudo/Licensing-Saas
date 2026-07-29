"use server";

import { revalidatePath } from "next/cache";
import { requireInternal, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { decideCurrentStep } from "@/lib/data/approvals";
import { logAudit } from "@/lib/data/audit";

export async function approveFromQueueAction(reqId: string, formData: FormData): Promise<void> {
  const session = await requireInternal();
  if (!can(session, PERMISSIONS.requisitionApprove)) return;
  const decision = String(formData.get("decision") ?? "");
  const comment = String(formData.get("comment") ?? "").trim() || null;
  if (decision !== "aprovada" && decision !== "reprovada") return;
  const res = await decideCurrentStep(session.tenantId, reqId, decision, comment, session.userId);
  await logAudit(
    session.tenantId,
    session.userId,
    "requisition.approval.step",
    "purchase_requisition",
    reqId,
    `${res.tierLabel}: ${decision}${res.final ? ` (requisição ${res.final})` : " (avança nível)"}${comment ? ` — ${comment}` : ""}`,
  );
  revalidatePath("/aprovacoes");
  revalidatePath(`/requisicoes/${reqId}`);
}
