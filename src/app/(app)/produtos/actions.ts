"use server";

import { revalidatePath } from "next/cache";
import { requireInternal, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { approveNextStage, decideStage } from "@/lib/data/products";

export async function approveStageAction(productId: string, approvalId: string) {
  const session = await requireInternal();
  if (!can(session, PERMISSIONS.productApprove)) return;
  await approveNextStage(session.tenantId, approvalId);
  revalidatePath(`/produtos/${productId}`);
  revalidatePath("/produtos");
}

const DECISIONS = ["aprovado", "aprovado_com_ressalvas", "reprovado"] as const;
type StageDecision = (typeof DECISIONS)[number];

export async function decideStageAction(productId: string, stageId: string, formData: FormData) {
  const session = await requireInternal();
  if (!can(session, PERMISSIONS.productApprove)) return;
  const decision = String(formData.get("decision") ?? "");
  if (!DECISIONS.includes(decision as StageDecision)) return;
  const comment = String(formData.get("comment") ?? "").trim() || null;
  await decideStage(session.tenantId, stageId, decision as StageDecision, comment, session.userId);
  revalidatePath(`/produtos/${productId}`);
  revalidatePath("/produtos");
}
