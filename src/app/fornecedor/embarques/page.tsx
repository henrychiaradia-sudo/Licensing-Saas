import { requireSupplierSession } from "@/lib/auth";
import { listSupplierShipments } from "@/lib/data/supplier-portal";
import { Card, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import type { ShipmentStatus } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";
const tone: Record<ShipmentStatus, Tone> = {
  preparacao: "neutral",
  em_transito: "info",
  desembaraco: "warn",
  entregue: "good",
  atrasado: "danger",
  cancelado: "neutral",
};
const label: Record<ShipmentStatus, string> = {
  preparacao: "Preparação",
  em_transito: "Em trânsito",
  desembaraco: "Desembaraço",
  entregue: "Entregue",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

export default async function SupplierShipmentsPage() {
  const session = await requireSupplierSession();
  const rows = await listSupplierShipments(session.tenantId, session.supplierId);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Embarques</h1>
        <p className="text-sm text-neutral-500">Rastreamento das suas entregas</p>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th scope="col" className="px-5 py-3 font-medium">Embarque</th>
              <th scope="col" className="px-5 py-3 font-medium">Pedido</th>
              <th scope="col" className="px-5 py-3 font-medium">Rota</th>
              <th scope="col" className="px-5 py-3 font-medium">ETA</th>
              <th scope="col" className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="px-5 py-3">
                  <div className="font-semibold">{r.shipmentNumber}</div>
                  <div className="text-xs text-neutral-400">
                    {r.carrier ?? "—"}
                    {r.trackingCode ? ` · ${r.trackingCode}` : ""}
                  </div>
                </td>
                <td className="px-5 py-3 text-neutral-500">{r.poNumber ?? "—"}</td>
                <td className="px-5 py-3 text-neutral-500">
                  {[r.origin, r.destination].filter(Boolean).join(" → ") || "—"}
                </td>
                <td className="px-5 py-3 tabular-nums text-neutral-500">{fmtDate(r.eta)}</td>
                <td className="px-5 py-3">
                  <Badge tone={tone[r.status]}>{label[r.status]}</Badge>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nenhum embarque registrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export const dynamic = "force-dynamic";
