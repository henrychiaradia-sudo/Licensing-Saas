"use server";

import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { registerPayment } from "@/lib/data/finance";

export async function registerPaymentAction(receivableId: string) {
  const session = await requireSession();
  if (!can(session, PERMISSIONS.financeWrite)) return;
  await registerPayment(session.tenantId, receivableId);
  revalidatePath("/financeiro");
}
