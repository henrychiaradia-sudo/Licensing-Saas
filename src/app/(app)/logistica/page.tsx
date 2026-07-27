import Link from "next/link";
import { Plus, Search, Truck, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listShipments, shipmentSummary } from "@/lib/data/shipments";
import { Button, Card, Badge, Input } from "@/components/ui";
import { ExportCsvButton } from "@/components/export-csv-button";
import { fmtDate } from "@/lib/utils";
import type { ShipmentStatus } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

export const shipmentTone: Record<ShipmentStatus, Tone> = {
  preparacao: "neutral",
  em_transito: "info",
  desembaraco: "warn",
  entregue: "good",
  atrasado: "danger",
  cancelado: "neutral",
};
export const shipmentLabel: Record<ShipmentStatus, string> = {
  preparacao: "Preparação",
  em_transito: "Em trânsito",
  desembaraco: "Desembaraço",
  entregue: "Entregue",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
};

const STATUS_KEYS = Object.keys(shipmentLabel) as ShipmentStatus[];

export default async function LogisticaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const session = await requireSession();
  const { q, status } = await searchParams;
  const statusFilter =
    status && (STATUS_KEYS as string[]).includes(status) ? (status as ShipmentStatus) : undefined;

  const [rows, summary] = await Promise.all([
    listShipments(session.tenantId, { q, status: statusFilter }),
    shipmentSummary(session.tenantId),
  ]);

  const csvColumns = [
    { key: "numero", label: "Embarque" },
    { key: "pedido", label: "Pedido" },
    { key: "fornecedor", label: "Fornecedor" },
    { key: "transportadora", label: "Transportadora" },
    { key: "rota", label: "Rota" },
    { key: "eta", label: "ETA" },
    { key: "status", label: "Status" },
  ];
  const csvRows = rows.map((r) => ({
    numero: r.shipmentNumber,
    pedido: r.poNumber ?? "",
    fornecedor: r.supplierName ?? "",
    transportadora: r.carrier ?? "",
    rota: [r.origin, r.destination].filter(Boolean).join(" → "),
    eta: r.eta ?? "",
    status: shipmentLabel[r.status],
  }));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Logística &amp; Supply Chain</h1>
          <p className="text-sm text-neutral-500">Rastreamento de embarques dos pedidos de compra</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportCsvButton filename="embarques.csv" columns={csvColumns} rows={csvRows} />
          <Link href="/logistica/new">
            <Button>
              <Plus size={16} /> Novo embarque
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Embarques" value={String(summary.total)} icon={<Truck size={16} className="text-neutral-400" />} />
        <Kpi
          label="Em trânsito"
          value={String(summary.inTransit)}
          icon={<Package size={16} className="text-blue-500" />}
        />
        <Kpi
          label="Atrasados"
          value={String(summary.late)}
          icon={<AlertTriangle size={16} className="text-amber-500" />}
          tone={summary.late > 0 ? "danger" : undefined}
        />
        <Kpi
          label="Entregues"
          value={String(summary.delivered)}
          icon={<CheckCircle2 size={16} className="text-emerald-500" />}
        />
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Buscar</label>
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <Input name="q" defaultValue={q ?? ""} placeholder="Nº, rastreio ou transportadora" className="pl-9" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Todos</option>
            {STATUS_KEYS.map((s) => (
              <option key={s} value={s}>
                {shipmentLabel[s]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {(q || statusFilter) && (
          <Link href="/logistica" className="text-sm text-neutral-500 hover:underline">
            Limpar
          </Link>
        )}
      </form>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-3 font-medium">Embarque</th>
              <th className="px-5 py-3 font-medium">Pedido</th>
              <th className="px-5 py-3 font-medium">Fornecedor</th>
              <th className="px-5 py-3 font-medium">Rota</th>
              <th className="px-5 py-3 font-medium">ETA</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
              >
                <td className="px-5 py-3">
                  <Link href={`/logistica/${r.id}`} className="font-semibold text-blue-600 hover:underline">
                    {r.shipmentNumber}
                  </Link>
                  <div className="text-xs text-neutral-400">{r.carrier ?? "—"}</div>
                </td>
                <td className="px-5 py-3 text-neutral-500">{r.poNumber ?? "—"}</td>
                <td className="px-5 py-3">{r.supplierName ?? "—"}</td>
                <td className="px-5 py-3 text-neutral-500">
                  {[r.origin, r.destination].filter(Boolean).join(" → ") || "—"}
                </td>
                <td className="px-5 py-3 tabular-nums text-neutral-500">{fmtDate(r.eta)}</td>
                <td className="px-5 py-3">
                  <Badge tone={shipmentTone[r.status]}>{shipmentLabel[r.status]}</Badge>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-neutral-400">
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

function Kpi({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "danger";
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">{label}</span>
        {icon}
      </div>
      <div className={`mt-3 text-2xl font-bold tabular-nums ${tone === "danger" ? "text-red-600" : ""}`}>
        {value}
      </div>
    </Card>
  );
}
