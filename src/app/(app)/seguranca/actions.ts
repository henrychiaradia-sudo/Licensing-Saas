"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import {
  beginMfaSetup,
  confirmMfa,
  disableMfa,
  changePassword,
} from "@/lib/data/security";

export type BeginState = {
  qrDataUrl?: string;
  secret?: string;
  error?: string | null;
};
export type FormState = { error: string | null; ok?: boolean };

export async function beginMfaSetupAction(
  _prev: BeginState,
  _formData: FormData,
): Promise<BeginState> {
  const session = await requireSession();
  try {
    const { qrDataUrl, secret } = await beginMfaSetup(session.userId, session.email);
    return { qrDataUrl, secret, error: null };
  } catch {
    return { error: "Não foi possível iniciar a configuração do 2FA." };
  }
}

export async function confirmMfaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const code = String(formData.get("code") ?? "").trim();
  const res = await confirmMfa(session.tenantId, session.userId, code, session.name);
  if (!res.ok) return { error: res.error ?? "Código inválido.", ok: false };
  revalidatePath("/seguranca");
  return { error: null, ok: true };
}

export async function disableMfaAction(): Promise<void> {
  const session = await requireSession();
  await disableMfa(session.tenantId, session.userId, session.name);
  revalidatePath("/seguranca");
}

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (next !== confirm) return { error: "A confirmação não confere com a nova senha.", ok: false };
  const res = await changePassword(session.tenantId, session.userId, current, next, session.name);
  if (!res.ok) return { error: res.error ?? "Não foi possível alterar a senha.", ok: false };
  revalidatePath("/seguranca");
  return { error: null, ok: true };
}
