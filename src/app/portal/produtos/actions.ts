"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireLicenseeSession } from "@/lib/auth";
import { submitProductForApproval, resubmitProduct } from "@/lib/data/portal";

const schema = z.object({
  brandId: z.string().uuid("Selecione uma marca válida."),
  sku: z.string().trim().min(1, "Informe o SKU.").max(60),
  name: z.string().trim().min(1, "Informe o nome do produto.").max(160),
  categoryId: z.string().optional().default(""),
  productLine: z.string().trim().max(120).optional().default(""),
  material: z.string().trim().max(120).optional().default(""),
  color: z.string().trim().max(80).optional().default(""),
  supplierName: z.string().trim().max(160).optional().default(""),
  suggestedPrice: z.coerce.number().min(0).max(1_000_000_000).optional().default(0),
  imageUrl: z.string().trim().max(1000).optional().default(""),
  barcode: z.string().trim().max(60).optional().default(""),
  upi: z.string().trim().max(60).optional().default(""),
  logoCode: z.string().trim().max(60).optional().default(""),
  pantone: z.string().trim().max(80).optional().default(""),
  technologies: z.string().trim().max(400).optional().default(""),
});

function splitTech(s: string | undefined | null): string[] | null {
  if (!s) return null;
  const arr = s
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  return arr.length > 0 ? arr : null;
}

export type SubmitProductResult = { ok: false; error: string };

export async function submitProductAction(input: unknown): Promise<SubmitProductResult> {
  const session = await requireLicenseeSession();

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  let productId: string;
  try {
    const result = await submitProductForApproval({
      tenantId: session.tenantId,
      licenseeId: session.licenseeId,
      userId: session.userId,
      brandId: d.brandId,
      sku: d.sku,
      name: d.name,
      categoryId: d.categoryId ? d.categoryId : null,
      productLine: d.productLine || null,
      material: d.material || null,
      color: d.color || null,
      supplierName: d.supplierName || null,
      suggestedPrice: d.suggestedPrice && d.suggestedPrice > 0 ? d.suggestedPrice : null,
      imageUrl: d.imageUrl || null,
      barcode: d.barcode || null,
      upi: d.upi || null,
      logoCode: d.logoCode || null,
      pantone: d.pantone || null,
      technologies: splitTech(d.technologies),
    });
    productId = result.productId;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Não foi possível submeter o produto.",
    };
  }

  redirect(`/portal/produtos/${productId}`);
}

const resubmitSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do produto.").max(160),
  productLine: z.string().trim().max(120).optional().default(""),
  material: z.string().trim().max(120).optional().default(""),
  color: z.string().trim().max(80).optional().default(""),
  supplierName: z.string().trim().max(160).optional().default(""),
  suggestedPrice: z.coerce.number().min(0).max(1_000_000_000).optional().default(0),
  imageUrl: z.string().trim().max(1000).optional().default(""),
});

export async function resubmitProductAction(
  productId: string,
  input: unknown,
): Promise<SubmitProductResult> {
  const session = await requireLicenseeSession();

  const parsed = resubmitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  try {
    await resubmitProduct({
      tenantId: session.tenantId,
      licenseeId: session.licenseeId,
      userId: session.userId,
      productId,
      name: d.name,
      productLine: d.productLine || null,
      material: d.material || null,
      color: d.color || null,
      supplierName: d.supplierName || null,
      suggestedPrice: d.suggestedPrice && d.suggestedPrice > 0 ? d.suggestedPrice : null,
      imageUrl: d.imageUrl || null,
    });
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Não foi possível reenviar o produto.",
    };
  }

  redirect(`/portal/produtos/${productId}`);
}
