"use server";

import { revalidatePath } from "next/cache";
import { requireSupplierSession } from "@/lib/auth";
import { respondSupplierNc } from "@/lib/data/supplier-portal";
import { logAudit } from "@/lib/data/audit";

export type FormState = { error: string | null; ok?: boolean };

export async function respondNcAction(
  ncId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSupplierSession();
  const correctiveAction = String(formData.get("correctiveAction") ?? "").trim();
  if (correctiveAction.length < 2) {
    return { error: "Descreva a ação corretiva." };
  }
  if (correctiveAction.length > 1000) {
    return { error: "Texto muito longo." };
  }
  try {
    await respondSupplierNc(session.tenantId, session.supplierId, ncId, correctiveAction);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar a resposta." };
  }
  await logAudit(
    session.tenantId,
    session.userId,
    "quality.nc.supplier_response",
    "non_conformity",
    ncId,
    "Fornecedor registrou ação corretiva (portal)",
  );
  revalidatePath("/fornecedor/qualidade");
  return { error: null, ok: true };
}
