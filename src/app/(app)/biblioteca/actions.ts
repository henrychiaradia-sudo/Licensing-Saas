"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { logDownload } from "@/lib/data/assets";

export async function downloadAction(assetId: string) {
  const session = await requireSession();
  await logDownload(session.tenantId, assetId, session.userId);
  revalidatePath("/biblioteca");
}
