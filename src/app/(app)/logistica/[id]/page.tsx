import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Truck } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getShipmentDetail } from "@/lib/data/shipments";
import { setShipmentStatusAction } from "../actions";
import { shipmentTone, shipmentLabel } from "../page";
import { Card, Badge, Button } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import type { ShipmentStatus } from "@/lib/db/schema";

function fmtDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const NEXT: Record<ShipmentStatus, { value: ShipmentStatus; label: string }[]> = {
  preparacao: [
    { value: "em_transito", label: "Marcar em trânsito" },
    { value: "atrasado", label: "Marcar atrasado" },
    { value: "cancelado", label: "Cancelar" },
  ],
  em_transito: [
    { value: "desembaraco", label: "Em desembaraço" },
    { value: "entregue", label: "Marcar entregue" },
    { value: "atrasado", label: "Marcar atrasado" },
  ],
  desembaraco: [
    { value: "entregue", label: "Marcar entregue" },
    { value: "atrasado", label: "Marcar atrasado" },
  ],
  atrasado: [
    { value: "em_transito", label: "Voltar a trânsito" },
    { value: "entregue", label: "Marcar entregue" },
    { value: "cancelado", label: "Cancelar" },
  ],
  entregue: [],
  cancelado: [],
};

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getShipmentDetail(session.tenantId, id);
  if (!data) notFound();
  const { shipment: sh, events } = data;
  const st = sh.status as ShipmentStatus;

  return (
    <div>
      <Link
        href="/logistica"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Logística &amp; Supply Chain
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Truck size={20} className="text-blue-500" /> {sh.shipmentNumber}
          </h1>
          <p className="text-sm text-neutral-500">
            {sh.carrier ?? "Transportadora não informada"}
            {sh.trackingCode ? ` · ${sh.trackingCode}` : ""}
          </p>
        </div>
        <Badge tone={shipmentTone[st]}>{shipmentLabel[st]}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Field
              label="Pedido"
              value={sh.poNumber}
              href={sh.purchaseOrderId ? `/compras/${sh.purchaseOrderId}` : undefined}
            />
            <Field label="Fornecedor" value={sh.supplierName} />
            <Field label="Incoterm" value={sh.incoterm} />
            <Field label="Origem" value={sh.origin} />
            <Field label="Destino" value={sh.destination} />
            <Field label="Embarcado em" value={fmtDate(sh.dispatchedAt)} />
            <Field label="ETA" value={fmtDate(sh.eta)} />
            <Field label="Entregue em" value={fmtDate(sh.deliveredAt)} />
          </dl>
          {sh.notes && (
            <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-500 dark:border-neutral-800">
              {sh.notes}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 text-sm font-semibold">Atualizar status</h2>
          <p className="mb-3 text-xs text-neutral-500">
            Cada mudança gera um evento na linha do tempo e na trilha de auditoria.
          </p>
          {NEXT[st].length === 0 ? (
            <p className="text-sm text-neutral-400">Embarque encerrado.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {NEXT[st].map((n) => (
                <form key={n.value} action={setShipmentStatusAction.bind(null, sh.id)}>
                  <input type="hidden" name="status" value={n.value} />
                  <Button
                    type="submit"
                    size="sm"
                    variant={n.value === "cancelado" || n.value === "atrasado" ? "outline" : "primary"}
                    className="w-full justify-center"
                  >
                    {n.label}
                  </Button>
                </form>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="mb-4 text-sm font-semibold">Linha do tempo</h2>
        {events.length === 0 ? (
          <p className="text-sm text-neutral-400">Sem eventos registrados.</p>
        ) : (
          <ol className="relative border-l border-neutral-200 dark:border-neutral-800">
            {events.map((e) => (
              <li key={e.id} className="mb-5 ml-4 last:mb-0">
                <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-blue-500 dark:border-neutral-900" />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={shipmentTone[e.status as ShipmentStatus]}>
                    {shipmentLabel[e.status as ShipmentStatus]}
                  </Badge>
                  <span className="text-xs tabular-nums text-neutral-400">{fmtDateTime(e.occurredAt)}</span>
                </div>
                {e.description && <p className="mt-1 text-sm">{e.description}</p>}
                {e.location && (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-neutral-400">
                    <MapPin size={12} /> {e.location}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="font-medium">
        {value ? (
          href ? (
            <Link href={href} className="text-blue-600 hover:underline">
              {value}
            </Link>
          ) : (
            value
          )
        ) : (
          "—"
        )}
      </dd>
    </div>
  );
}
