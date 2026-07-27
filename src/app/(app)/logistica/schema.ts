import { z } from "zod";

export const SHIPMENT_STATUS = [
  "preparacao",
  "em_transito",
  "desembaraco",
  "entregue",
  "atrasado",
  "cancelado",
] as const;

export const shipmentSchema = z.object({
  purchaseOrderId: z.string().uuid().nullable(),
  supplierId: z.string().uuid().nullable(),
  carrier: z.string().trim().max(160).nullable(),
  trackingCode: z.string().trim().max(120).nullable(),
  status: z.enum(SHIPMENT_STATUS),
  origin: z.string().trim().max(160).nullable(),
  destination: z.string().trim().max(160).nullable(),
  incoterm: z.string().trim().max(20).nullable(),
  dispatchedAt: z.string().nullable(),
  eta: z.string().nullable(),
  notes: z.string().trim().max(2000).nullable(),
});
