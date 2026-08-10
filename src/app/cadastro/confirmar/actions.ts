"use server";

import { redirect } from "next/navigation";
import { createSession } from "@/lib/session";
import { confirmSignup, SignupError, type SignupErrorCode } from "@/lib/data/onboarding";

export type ConfirmState = { error?: SignupErrorCode };

export async function confirmAction(_prev: ConfirmState, formData: FormData): Promise<ConfirmState> {
  const token = String(formData.get("token") ?? "");
  try {
    const r = await confirmSignup(token);
    await createSession({
      userId: r.userId,
      tenantId: r.tenantId,
      name: r.adminName,
      email: r.email,
      permissions: r.permissions,
      licenseeId: null,
      supplierId: null,
      isInternal: true,
    });
  } catch (e) {
    if (e instanceof SignupError) return { error: e.code };
    throw e;
  }
  // Fora do try/catch: redirect() lança um sinal interno que NÃO deve ser capturado.
  redirect("/dashboard");
}
