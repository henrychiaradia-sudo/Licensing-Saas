"use server";

import { redirect } from "next/navigation";
import { authenticate } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const res = await authenticate(email, password);
  if (!res.ok) redirect("/login?error=1");
  redirect("/dashboard");
}
