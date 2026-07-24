"use server";

import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { approveRoyaltyReport } from "@/lib/data/royalties";

export async function approveReportAction(id: string) {
  const session = await requireSession();
  if (!can(session, PERMISSIONS.royaltyApprove)) return;
  await approveRoyaltyReport(session.tenantId, id, session.userId);
  revalidatePath(`/royalties/${id}`);
  revalidatePath("/royalties");
}
