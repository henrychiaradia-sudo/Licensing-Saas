"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInternal, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { saveRoyaltyRule } from "@/lib/data/royalties";

const optNum = z.union([z.coerce.number(), z.literal(""), z.null()]).optional();

const tierSchema = z.object({
  tierFrom: z.coerce.number().min(0),
  tierTo: z.union([z.coerce.number().min(0), z.literal(""), z.null()]).optional(),
  rate: z.coerce.number().min(0).max(100),
});

const schema = z.object({
  royaltyType: z.enum(["percentual", "fixo", "hibrido", "escalonado"]),
  base: z.enum(["gross_sales", "net_sales", "units"]),
  percentage: optNum,
  fixedAmount: optNum,
  minRoyalty: optNum,
  maxRoyalty: optNum,
  tiers: z.array(tierSchema).default([]),
});

export type SaveRuleResult = { ok: true } | { ok: false; error: string };

const numOrNull = (x: unknown): number | null => (x === "" || x == null ? null : Number(x));

export async function saveRoyaltyRuleAction(
  contractId: string,
  input: unknown,
): Promise<SaveRuleResult> {
  const session = await requireInternal();
  if (!can(session, PERMISSIONS.contractWrite)) {
    return { ok: false, error: "Você não tem permissão para editar a regra de royalty." };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  if (d.royaltyType === "percentual" && numOrNull(d.percentage) == null) {
    return { ok: false, error: "Informe a alíquota (%) para o tipo percentual." };
  }
  if (d.royaltyType === "escalonado" && d.tiers.length === 0) {
    return { ok: false, error: "Adicione ao menos uma faixa para o tipo escalonado." };
  }

  try {
    await saveRoyaltyRule(session.tenantId, contractId, null, {
      royaltyType: d.royaltyType,
      base: d.base,
      percentage: numOrNull(d.percentage),
      fixedAmount: numOrNull(d.fixedAmount),
      minRoyalty: numOrNull(d.minRoyalty),
      maxRoyalty: numOrNull(d.maxRoyalty),
      tiers:
        d.royaltyType === "escalonado"
          ? d.tiers.map((t) => ({
              tierFrom: Number(t.tierFrom),
              tierTo: t.tierTo === "" || t.tierTo == null ? null : Number(t.tierTo),
              rate: Number(t.rate),
            }))
          : [],
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Não foi possível salvar a regra." };
  }

  revalidatePath(`/contratos/${contractId}`);
  return { ok: true };
}
