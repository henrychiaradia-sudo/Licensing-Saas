"use server";

import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const code = String(formData.get("code") || "").trim();
  const res = await authenticate(email, password, code || undefined);
  if (!res.ok) {
    const params = new URLSearchParams({ e: res.error });
    if (res.mfaRequired) params.set("mfa", "1");
    redirect(`/login?${params.toString()}`);
  }
  redirect("/dashboard");
}
