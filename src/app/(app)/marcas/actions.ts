"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { createBrand, updateBrand, type BrandInput } from "@/lib/data/brands";
import { brandSchema } from "./schema";

export type FormState = { error: string | null };

export async function saveBrand(
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!can(session, PERMISSIONS.brandWrite)) {
    return { error: "Você não tem permissão para editar marcas." };
  }
  const parsed = brandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;
  const input: BrandInput = {
    code: d.code,
    name: d.name,
    ownerArea: d.ownerArea || null,
    status: d.status,
    language: d.language || null,
    description: d.description || null,
    validFrom: d.validFrom || null,
    validTo: d.validTo || null,
  };
  if (id) await updateBrand(session.tenantId, id, input);
  else await createBrand(session.tenantId, input);
  revalidatePath("/marcas");
  redirect("/marcas");
}
