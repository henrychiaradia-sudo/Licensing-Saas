"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { approveNextStage } from "@/lib/data/products";

export async function approveStageAction(productId: string, approvalId: string) {
  const session = await requireSession();
  await approveNextStage(session.tenantId, approvalId);
  revalidatePath(`/produtos/${productId}`);
  revalidatePath("/produtos");
}
