"use server";

import { revalidatePath } from "next/cache";
import { requireSession, requireInternal } from "@/lib/auth";
import {
  setPreference,
  createWebhook,
  setWebhookActive,
  removeWebhook,
  testWebhook,
} from "@/lib/data/notifications";
import type { NotifChannel } from "@/lib/notif-meta";

export async function setPreferenceAction(
  type: string,
  channel: NotifChannel,
  on: boolean,
): Promise<void> {
  const session = await requireSession();
  await setPreference(session.tenantId, session.userId, type, channel, on);
  revalidatePath("/notificacoes/preferencias");
}

export async function createWebhookAction(formData: FormData): Promise<void> {
  const session = await requireInternal();
  const url = String(formData.get("url") ?? "").trim();
  if (!/^https?:\/\//i.test(url)) return;
  const label = String(formData.get("label") ?? "").trim() || null;
  const events = String(formData.get("events") ?? "all").trim() || "all";
  const secret = String(formData.get("secret") ?? "").trim() || null;
  await createWebhook(session.tenantId, { label, url, events, secret }, session.userId);
  revalidatePath("/notificacoes/preferencias");
}

export async function toggleWebhookAction(id: string, active: boolean): Promise<void> {
  const session = await requireInternal();
  await setWebhookActive(session.tenantId, id, active);
  revalidatePath("/notificacoes/preferencias");
}

export async function removeWebhookAction(id: string): Promise<void> {
  const session = await requireInternal();
  await removeWebhook(session.tenantId, id);
  revalidatePath("/notificacoes/preferencias");
}

export async function testWebhookAction(id: string): Promise<void> {
  const session = await requireInternal();
  await testWebhook(session.tenantId, id);
  revalidatePath("/notificacoes/preferencias");
}
