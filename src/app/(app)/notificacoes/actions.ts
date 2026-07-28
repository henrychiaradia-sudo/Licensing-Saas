"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { markRead, markAllRead } from "@/lib/data/notifications";

export async function markReadAction(id: string): Promise<void> {
  const session = await requireSession();
  await markRead(session.tenantId, id);
  revalidatePath("/notificacoes");
  revalidatePath("/", "layout");
}

export async function markAllReadAction(): Promise<void> {
  const session = await requireSession();
  await markAllRead(session.tenantId);
  revalidatePath("/notificacoes");
  revalidatePath("/", "layout");
}
