"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  createChecklist,
  addChecklistItem,
  deleteChecklistItem,
  setChecklistActive,
  deleteChecklist,
} from "@/lib/data/homologation";
import { logAudit } from "@/lib/data/audit";
import { SUPPLIER_TYPE } from "../fornecedores/schema";
import type { SupplierType } from "@/lib/db/schema";

export type SubState = { error: string | null; ok?: boolean };

function canWrite(session: Parameters<typeof can>[0]) {
  return (
    can(session, PERMISSIONS.financeWrite) ||
    can(session, PERMISSIONS.contractWrite) ||
    session.isInternal
  );
}
async function guard() {
  const s = await requireSession();
  if (!canWrite(s)) throw new Error("Sem permissão.");
  return s;
}
function emptyToNull(v: FormDataEntryValue | null): string | null {
  const x = v == null ? "" : String(v).trim();
  return x === "" ? null : x;
}

export async function createChecklistAction(_p: SubState, fd: FormData): Promise<SubState> {
  const s = await guard();
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Informe o nome do checklist." };
  const stRaw = String(fd.get("supplierType") ?? "");
  const supplierType = (SUPPLIER_TYPE as readonly string[]).includes(stRaw)
    ? (stRaw as SupplierType)
    : null;
  try {
    const { id } = await createChecklist(s.tenantId, {
      name,
      description: emptyToNull(fd.get("description")),
      supplierType,
    });
    await logAudit(
      s.tenantId,
      s.userId,
      "homologation.checklist.create",
      "homologation_checklist",
      id,
      `Checklist "${name}" criado`,
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao criar checklist." };
  }
  revalidatePath("/homologacao");
  return { error: null, ok: true };
}

export async function addItemAction(checklistId: string, _p: SubState, fd: FormData): Promise<SubState> {
  const s = await guard();
  const label = String(fd.get("label") ?? "").trim();
  if (label.length < 2) return { error: "Informe o item." };
  const weight = parseInt(String(fd.get("weight") ?? "1"), 10);
  try {
    await addChecklistItem(s.tenantId, checklistId, {
      label,
      category: emptyToNull(fd.get("category")),
      weight: Number.isFinite(weight) && weight > 0 ? weight : 1,
      required: fd.get("required") === "1",
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Erro ao adicionar item." };
  }
  revalidatePath(`/homologacao/${checklistId}`);
  return { error: null, ok: true };
}

export async function deleteItemAction(checklistId: string, itemId: string): Promise<void> {
  const s = await guard();
  await deleteChecklistItem(s.tenantId, itemId);
  revalidatePath(`/homologacao/${checklistId}`);
}

export async function toggleActiveAction(id: string, isActive: boolean): Promise<void> {
  const s = await guard();
  await setChecklistActive(s.tenantId, id, isActive);
  revalidatePath("/homologacao");
  revalidatePath(`/homologacao/${id}`);
}

export async function deleteChecklistAction(id: string): Promise<void> {
  const s = await guard();
  await deleteChecklist(s.tenantId, id);
  revalidatePath("/homologacao");
  redirect("/homologacao");
}
