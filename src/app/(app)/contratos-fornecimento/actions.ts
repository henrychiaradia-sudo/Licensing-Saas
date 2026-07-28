"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  createSupplyContract,
  setSupplyContractStatus,
  type SupplyContractInput,
} from "@/lib/data/supply-contracts";
import { logAudit } from "@/lib/data/audit";
import { supplyContractSchema, SUPPLY_STATUS } from "./schema";
import type { SupplyContractStatus } from "@/lib/db/schema";

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

function canWriteSupply(session: Parameters<typeof can>[0]) {
  return session.isInternal || can(session, PERMISSIONS.contractWrite);
}

export async function createSupplyContractAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteSupply(session)) {
    return { error: "Você não tem permissão para gerenciar contratos de fornecimento." };
  }
  const candidate = {
    title: String(formData.get("title") ?? "").trim(),
    supplierId: String(formData.get("supplierId") ?? "").trim(),
    status: String(formData.get("status") ?? "rascunho"),
    categoryId: emptyToNull(formData.get("categoryId")),
    currency: String(formData.get("currency") ?? "BRL").trim().toUpperCase(),
    totalValue: numOrZero(formData.get("totalValue")),
    sla: emptyToNull(formData.get("sla")),
    paymentTerms: emptyToNull(formData.get("paymentTerms")),
    startDate: emptyToNull(formData.get("startDate")),
    endDate: emptyToNull(formData.get("endDate")),
    autoRenew: formData.get("autoRenew") === "on" || formData.get("autoRenew") === "true",
    notes: emptyToNull(formData.get("notes")),
  };
  const parsed = supplyContractSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input: SupplyContractInput = parsed.data;
  let id: string;
  try {
    id = (await createSupplyContract(session.tenantId, input, session.userId)).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar o contrato." };
  }
  await logAudit(
    session.tenantId,
    session.userId,
    "supply_contract.create",
    "supply_contract",
    id,
    `Contrato de fornecimento "${input.title}" criado`,
  );
  redirect(`/contratos-fornecimento/${id}`);
}

export async function setSupplyContractStatusAction(id: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!canWriteSupply(session)) return;
  const status = String(formData.get("status") ?? "");
  if (!(SUPPLY_STATUS as readonly string[]).includes(status)) return;
  const { previous } = await setSupplyContractStatus(session.tenantId, id, status as SupplyContractStatus);
  await logAudit(
    session.tenantId,
    session.userId,
    "supply_contract.status",
    "supply_contract",
    id,
    `Status do contrato → ${status}`,
    { before: { status: previous }, after: { status }, actorName: session.name },
  );
  revalidatePath(`/contratos-fornecimento/${id}`);
  revalidatePath("/contratos-fornecimento");
}
