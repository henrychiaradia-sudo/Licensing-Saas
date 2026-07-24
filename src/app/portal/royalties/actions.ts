"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireLicenseeSession } from "@/lib/auth";
import { submitRoyaltyReport } from "@/lib/data/portal";

const lineSchema = z.object({
  sku: z.string().trim().max(60).optional().default(""),
  productName: z.string().trim().max(160).optional().default(""),
  units: z.coerce.number().min(0).max(1_000_000_000).default(0),
  grossAmount: z.coerce.number().min(0).max(1_000_000_000_000).default(0),
  deductions: z.coerce.number().min(0).max(1_000_000_000_000).default(0),
});

const reportSchema = z.object({
  contractId: z.string().uuid("Contrato inválido."),
  referenceLabel: z.string().regex(/^\d{4}-\d{2}$/, "Use o formato AAAA-MM (ex.: 2026-07)."),
  lines: z.array(lineSchema).min(1, "Adicione ao menos uma linha ao reporte."),
});

export type SubmitActionResult = { ok: false; error: string };

export async function submitReportAction(input: unknown): Promise<SubmitActionResult> {
  const session = await requireLicenseeSession();

  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  const [year, month] = d.referenceLabel.split("-").map(Number);
  const periodStart = `${d.referenceLabel}-01`;
  const periodEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10); // último dia do mês

  let reportId: string;
  try {
    const result = await submitRoyaltyReport({
      tenantId: session.tenantId,
      licenseeId: session.licenseeId,
      userId: session.userId,
      contractId: d.contractId,
      referenceLabel: d.referenceLabel,
      periodStart,
      periodEnd,
      lines: d.lines,
    });
    reportId = result.reportId;
  } catch {
    return { ok: false, error: "Não foi possível enviar o reporte. Verifique os dados e tente novamente." };
  }

  redirect(`/portal/royalties/${reportId}`);
}
