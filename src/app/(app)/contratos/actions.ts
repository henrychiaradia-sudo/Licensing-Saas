"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { createContract, updateContract, type ContractInput } from "@/lib/data/contracts";
import { contractSchema } from "./schema";

export type FormState = { error: string | null };

function parseNumOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseIntOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "") return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}

export async function saveContract(
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!can(session, PERMISSIONS.contractWrite)) {
    return { error: "Você não tem permissão para editar contratos." };
  }

  const candidate = {
    contractNumber: String(formData.get("contractNumber") ?? "").trim(),
    licenseeId: String(formData.get("licenseeId") ?? ""),
    currencyId: String(formData.get("currencyId") ?? ""),
    status: String(formData.get("status") ?? "rascunho"),
    exclusivity: String(formData.get("exclusivity") ?? "nao_exclusivo"),
    signingDate: emptyToNull(formData.get("signingDate")),
    startDate: emptyToNull(formData.get("startDate")),
    endDate: emptyToNull(formData.get("endDate")),
    autoRenewal: formData.get("autoRenewal") != null,
    renewalTermMonths: parseIntOrNull(formData.get("renewalTermMonths")),
    minimumGuaranteeTotal: parseNumOrNull(formData.get("minimumGuaranteeTotal")),
    insuranceRequired: formData.get("insuranceRequired") != null,
    insuranceInfo: emptyToNull(formData.get("insuranceInfo")),
    notes: emptyToNull(formData.get("notes")),
    brandIds: formData.getAll("brandIds").map((b) => String(b)),
  };

  const parsed = contractSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input: ContractInput = parsed.data;

  try {
    if (id) await updateContract(session.tenantId, id, input, session.userId);
    else await createContract(session.tenantId, input, session.userId);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar o contrato." };
  }

  revalidatePath("/contratos");
  redirect("/contratos");
}
