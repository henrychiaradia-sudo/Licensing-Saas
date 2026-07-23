"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { createLicensee, updateLicensee, type LicenseeInput } from "@/lib/data/licensees";
import { licenseeSchema } from "./schema";
import type { RiskRating } from "@/lib/db/schema";

export type FormState = { error: string | null };

const RISKS = ["baixo", "medio", "alto", "critico"];

export async function saveLicensee(
  id: string | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!can(session, PERMISSIONS.licenseeWrite)) {
    return { error: "Você não tem permissão para editar licenciados." };
  }

  const parsed = licenseeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const d = parsed.data;
  const score = d.financialScore ? Number(d.financialScore) : null;
  const input: LicenseeInput = {
    legalName: d.legalName,
    tradeName: d.tradeName || null,
    taxId: d.taxId || null,
    countryId: d.countryId || null,
    segmentId: d.segmentId || null,
    state: d.state || null,
    city: d.city || null,
    website: d.website || null,
    status: d.status,
    riskRating: d.riskRating && RISKS.includes(d.riskRating) ? (d.riskRating as RiskRating) : null,
    financialScore: score !== null && !Number.isNaN(score) ? score : null,
  };

  if (id) await updateLicensee(session.tenantId, id, input);
  else await createLicensee(session.tenantId, input);

  revalidatePath("/licenciados");
  redirect("/licenciados");
}
