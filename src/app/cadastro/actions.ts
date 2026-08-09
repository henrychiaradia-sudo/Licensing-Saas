"use server";

import { redirect } from "next/navigation";
import { createSession } from "@/lib/session";
import { validatePassword } from "@/lib/security";
import { provisionTenant, emailIsAvailable } from "@/lib/data/onboarding";

export type SignUpState = { error?: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function signUpAction(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const companyName = String(formData.get("companyName") ?? "").trim();
  const adminName = String(formData.get("adminName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!companyName || !adminName || !email || !password) {
    return { error: "Preencha todos os campos." };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "Informe um e-mail válido." };
  }
  const pol = validatePassword(password);
  if (!pol.ok) return { error: pol.error };

  if (!(await emailIsAvailable(email))) {
    return { error: "Este e-mail já está cadastrado. Tente fazer login." };
  }

  const { tenantId, userId, permissions } = await provisionTenant({
    companyName,
    adminName,
    email,
    password,
  });

  await createSession({
    userId,
    tenantId,
    name: adminName,
    email,
    permissions,
    licenseeId: null,
    supplierId: null,
    isInternal: true,
  });

  redirect("/dashboard");
}
