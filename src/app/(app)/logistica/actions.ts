"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { createShipment, setShipmentStatus, type ShipmentInput } from "@/lib/data/shipments";
import { logAudit } from "@/lib/data/audit";
import { shipmentSchema, SHIPMENT_STATUS } from "./schema";
import type { ShipmentStatus } from "@/lib/db/schema";

export type FormState = { error: string | null };

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
}

function canWriteLogistics(session: Parameters<typeof can>[0]) {
  return (
    session.isInternal ||
    can(session, PERMISSIONS.financeWrite) ||
    can(session, PERMISSIONS.contractWrite)
  );
}

export async function createShipmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await requireSession();
  if (!canWriteLogistics(session)) {
    return { error: "Você não tem permissão para registrar embarques." };
  }

  const candidate = {
    purchaseOrderId: emptyToNull(formData.get("purchaseOrderId")),
    supplierId: emptyToNull(formData.get("supplierId")),
    carrier: emptyToNull(formData.get("carrier")),
    trackingCode: emptyToNull(formData.get("trackingCode")),
    status: String(formData.get("status") ?? "preparacao"),
    origin: emptyToNull(formData.get("origin")),
    destination: emptyToNull(formData.get("destination")),
    incoterm: emptyToNull(formData.get("incoterm")),
    dispatchedAt: emptyToNull(formData.get("dispatchedAt")),
    eta: emptyToNull(formData.get("eta")),
    notes: emptyToNull(formData.get("notes")),
  };

  const parsed = shipmentSchema.safeParse(candidate);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const input: ShipmentInput = parsed.data;

  let id: string;
  try {
    id = (await createShipment(session.tenantId, input, session.userId)).id;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível registrar o embarque." };
  }

  await logAudit(
    session.tenantId,
    session.userId,
    "shipment.create",
    "shipment",
    id,
    "Embarque registrado",
  );

  redirect(`/logistica/${id}`);
}

export async function setShipmentStatusAction(id: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  if (!canWriteLogistics(session)) return;
  const status = String(formData.get("status") ?? "");
  const location = emptyToNull(formData.get("location"));
  if (!(SHIPMENT_STATUS as readonly string[]).includes(status)) return;
  await setShipmentStatus(session.tenantId, id, status as ShipmentStatus, session.userId, location);
  await logAudit(
    session.tenantId,
    session.userId,
    "shipment.status",
    "shipment",
    id,
    `Status do embarque → ${status}`,
  );
  revalidatePath(`/logistica/${id}`);
  revalidatePath("/logistica");
}
