import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listPoOptionsForShipment } from "@/lib/data/shipments";
import { ShipmentForm } from "../shipment-form";

export default async function NewShipmentPage() {
  const session = await requireSession();
  const pos = await listPoOptionsForShipment(session.tenantId);

  return (
    <div>
      <Link
        href="/logistica"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Logística &amp; Supply Chain
      </Link>
      <h1 className="mb-1 text-xl font-bold">Novo embarque</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Registre um embarque e acompanhe o status até a entrega.
      </p>
      <ShipmentForm
        pos={pos.map((p) => ({
          id: p.id,
          label: `${p.poNumber}${p.supplierName ? ` — ${p.supplierName}` : ""}`,
        }))}
      />
    </div>
  );
}
