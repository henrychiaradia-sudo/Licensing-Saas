"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { upsertBudget, CURRENT_FISCAL_YEAR } from "@/lib/data/purchase-budget";
import { logAudit } from "@/lib/data/audit";

export type FormState = { error: string | null; ok?: boolean };

function numOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  let s = String(v).trim();
  if (s === "") return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function setBudgetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const categoryId = String(formData.get("categoryId") ?? "");
  const amount = numOrNull(formData.get("amount"));
  const yearRaw = parseInt(String(formData.get("fiscalYear") ?? ""), 10);
  const fiscalYear = Number.isFinite(yearRaw) ? yearRaw : CURRENT_FISCAL_YEAR;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!categoryId) return { error: "Selecione a categoria." };
  if (amount == null || amount < 0) return { error: "Informe um valor de orçamento válido." };
  if (fiscalYear < 2000 || fiscalYear > 2100) return { error: "Ano fiscal inválido." };

  try {
    await upsertBudget(
      session.tenantId,
      { purchaseCategoryId: categoryId, fiscalYear, amount, notes },
      session.userId,
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar o orçamento." };
  }
  await logAudit(
    session.tenantId,
    session.userId,
    "budget.set",
    "purchase_budget",
    categoryId,
    `Orçamento ${fiscalYear}: ${amount.toFixed(2)}`,
  );
  revalidatePath("/budget");
  return { error: null, ok: true };
}
