"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireInternal, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { registerPayment, registerPaymentDetailed } from "@/lib/data/finance";

export async function registerPaymentAction(receivableId: string) {
  const session = await requireInternal();
  if (!can(session, PERMISSIONS.financeWrite)) return;
  await registerPayment(session.tenantId, receivableId);
  revalidatePath("/financeiro");
}

const paySchema = z.object({
  amount: z.coerce.number().positive("Informe um valor maior que zero.").max(1_000_000_000_000),
  method: z.enum(["boleto", "pix", "ted", "wire_transfer", "cartao", "outro"]),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  reference: z.string().trim().max(120).optional().default(""),
});

export type PayResult = { ok: true } | { ok: false; error: string };

export async function registerPaymentDetailedAction(
  receivableId: string,
  input: unknown,
): Promise<PayResult> {
  const session = await requireInternal();
  if (!can(session, PERMISSIONS.financeWrite)) {
    return { ok: false, error: "Você não tem permissão para registrar pagamentos." };
  }

  const parsed = paySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  try {
    await registerPaymentDetailed(session.tenantId, receivableId, {
      amount: d.amount,
      method: d.method,
      paidAt: d.paidAt,
      reference: d.reference || null,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Não foi possível registrar o pagamento.",
    };
  }

  revalidatePath(`/financeiro/${receivableId}`);
  revalidatePath("/financeiro");
  return { ok: true };
}
