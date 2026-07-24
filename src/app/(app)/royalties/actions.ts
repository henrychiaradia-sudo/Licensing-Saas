"use server";

import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { approveAndInvoiceReport, rejectRoyaltyReport } from "@/lib/data/royalties";

export async function approveReportAction(id: string) {
  const session = await requireSession();
  if (!can(session, PERMISSIONS.royaltyApprove)) return;
  await approveAndInvoiceReport(session.tenantId, id, session.userId);
  revalidatePath(`/royalties/${id}`);
  revalidatePath("/royalties");
  revalidatePath("/financeiro");
}

export async function rejectReportAction(id: string) {
  const session = await requireSession();
  if (!can(session, PERMISSIONS.royaltyApprove)) return;
  await rejectRoyaltyReport(session.tenantId, id);
  revalidatePath(`/royalties/${id}`);
  revalidatePath("/royalties");
}
