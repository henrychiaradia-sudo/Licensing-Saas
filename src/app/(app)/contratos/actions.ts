"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import {
  createContract,
  updateContract,
  addContractAmendment,
  type ContractInput,
} from "@/lib/data/contracts";
import { logAudit } from "@/lib/data/audit";
import { contractSchema } from "./schema";
import type { ContractAmendmentType } from "@/lib/db/schema";

export type FormState = { error: string | null };

const AMENDMENT_TYPES = ["aditivo", "prorrogacao", "reajuste", "rescisao", "outro"] as const;

function parseNumOrNull(v: FormDataEntryValue | null): number | null {
  if (v == null) return null;
  let s = String(v).trim();
  if (s === "") return null;
  // Se houver vírgula, é formato BR (ponto = milhar, vírgula = decimal).
  // Um <input type="number"> já envia com ponto decimal (ex.: "500000.5"),
  // então não removemos o ponto nesse caso.
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
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
    responsibleName: emptyToNull(formData.get("responsibleName")),
    responsibleEmail: emptyToNull(formData.get("responsibleEmail")),
    responsiblePhone: emptyToNull(formData.get("responsiblePhone")),
    brandIds: formData.getAll("brandIds").map((b) => String(b)),
  };

  const parsed = contractSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input: ContractInput = parsed.data;

  try {
    if (id) {
      await updateContract(session.tenantId, id, input, session.userId);
      await logAudit(
        session.tenantId,
        session.userId,
        "contract.update",
        "contract",
        id,
        `Contrato ${input.contractNumber} atualizado`,
      );
    } else {
      const res = await createContract(session.tenantId, input, session.userId);
      await logAudit(
        session.tenantId,
        session.userId,
        "contract.create",
        "contract",
        res.id,
        `Contrato ${input.contractNumber} criado`,
      );
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível salvar o contrato." };
  }

  revalidatePath("/contratos");
  redirect("/contratos");
}

export async function addAmendmentAction(
  contractId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!can(session, PERMISSIONS.contractWrite)) {
    return { error: "Você não tem permissão para editar contratos." };
  }
  const type = String(formData.get("amendmentType") ?? "aditivo");
  if (!(AMENDMENT_TYPES as readonly string[]).includes(type)) {
    return { error: "Tipo de aditivo inválido." };
  }
  try {
    await addContractAmendment(
      session.tenantId,
      contractId,
      {
        amendmentType: type as ContractAmendmentType,
        description: emptyToNull(formData.get("description")),
        effectiveDate: emptyToNull(formData.get("effectiveDate")),
        newEndDate: emptyToNull(formData.get("newEndDate")),
      },
      session.userId,
    );
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar o aditivo." };
  }
  await logAudit(
    session.tenantId,
    session.userId,
    "contract.amendment",
    "contract",
    contractId,
    `Aditivo (${type}) registrado`,
  );
  revalidatePath(`/contratos/${contractId}`);
  return { error: null };
}
