"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import {
  createPurchaseContract,
  setPurchaseContractStatus,
  type PurchaseContractInput,
} from "@/lib/data/purchase-contracts";
import { logAudit } from "@/lib/data/audit";
import { purchaseContractSchema } from "./schema";
import type { PurchaseContractStatus } from "@/lib/db/schema";

export type FormState = { error: string | null };

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}
function numOrZero(v: FormDataEntryValue | null): number {
  if (v == null) return 0;
  let s = String(v).trim();
  if (s === "") return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export async function createPurchaseContractAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  const candidate = {
    title: String(formData.get("title") ?? "").trim(),
    supplierId: String(formData.get("supplierId") ?? ""),
    supplyContractId: emptyToNull(formData.get("supplyContractId")),
    status: String(formData.get("status") ?? "rascunho"),
    currency: String(formData.get("currency") ?? "BRL").trim().toUpperCase(),
    committedValue: numOrZero(formData.get("committedValue")),
    startDate: emptyToNull(formData.get("startDate")),
    endDate: emptyToNull(formData.get("endDate")),
    paymentTerms: emptyToNull(formData.get("paymentTerms")),
    notes: emptyToNull(formData.get("notes")),
  };
  const parsed = purchaseContractSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  let id: string;
  try {
    id = (
      await createPurchaseContract(session.tenantId, parsed.data as PurchaseContractInput, session.userId)
    ).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar o contrato." };
  }
  await logAudit(
    session.tenantId,
    session.userId,
    "purchase_contract.create",
    "purchase_contract",
    id,
    `Contrato de compra "${parsed.data.title}" criado`,
  );
  revalidatePath("/contratos-compra");
  redirect(`/contratos-compra/${id}`);
}

export async function setPurchaseContractStatusAction(id: string, status: string): Promise<void> {
  const session = await requireSession();
  const valid = ["rascunho", "vigente", "suspenso", "encerrado"];
  if (!valid.includes(status)) return;
  await setPurchaseContractStatus(session.tenantId, id, status as PurchaseContractStatus);
  await logAudit(
    session.tenantId,
    session.userId,
    "purchase_contract.status",
    "purchase_contract",
    id,
    `Contrato → ${status}`,
  );
  revalidatePath(`/contratos-compra/${id}`);
  revalidatePath("/contratos-compra");
}
