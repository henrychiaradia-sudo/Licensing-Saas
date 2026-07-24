"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { approveNextStage, decideStage } from "@/lib/data/products";

export async function approveStageAction(productId: string, approvalId: string) {
  const session = await requireSession();
  await approveNextStage(session.tenantId, approvalId);
  revalidatePath(`/produtos/${productId}`);
  revalidatePath("/produtos");
}

const DECISIONS = ["aprovado", "aprovado_com_ressalvas", "reprovado"] as const;
type StageDecision = (typeof DECISIONS)[number];

export async function decideStageAction(productId: string, stageId: string, formData: FormData) {
  const session = await requireSession();
  const decision = String(formData.get("decision") ?? "");
  if (!DECISIONS.includes(decision as StageDecision)) return;
  const comment = String(formData.get("comment") ?? "").trim() || null;
  await decideStage(session.tenantId, stageId, decision as StageDecision, comment, session.userId);
  revalidatePath(`/produtos/${productId}`);
  revalidatePath("/produtos");
}
