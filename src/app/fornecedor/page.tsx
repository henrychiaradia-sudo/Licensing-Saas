import Link from "next/link";
import { ShoppingCart, Truck, AlertTriangle, Gauge, ArrowRight } from "lucide-react";
import { requireSupplierSession } from "@/lib/auth";
import { supplierPortalOverview, listSupplierNcs } from "@/lib/data/supplier-portal";
import { Card, Badge } from "@/components/ui";
import { fmtMoney } from "@/lib/utils";

export default async function SupplierHomePage() {
  const session = await requireSupplierSession();
  const [ov, ncs] = await Promise.all([
    supplierPortalOverview(session.tenantId, session.supplierId),
    listSupplierNcs(session.tenantId, session.supplierId),
  ]);
  const openNcs = ncs.filter((n) => n.status === "aberta" || n.status === "em_tratamento");

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Início</h1>
        <p className="text-sm text-neutral-500">Seu resumo com a NovaSport Global</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Pedidos abertos"
          value={String(ov.openPos)}
          hint={fmtMoney(ov.committed)}
          icon={<ShoppingCart size={16} className="text-blue-500" />}
        />
        <Kpi
          label="Embarques em trânsito"
          value={String(ov.inTransit)}
          icon={<Truck size={16} className="text-indigo-500" />}
        />
        <Kpi
          label="NCs abertas"
          value={String(ov.openNc)}
          icon={<AlertTriangle size={16} className="text-amber-500" />}
          tone={ov.openNc > 0 ? "danger" : undefined}
        />
        <Kpi
          label="Nota do scorecard"
          value={ov.latestScore != null ? `${ov.latestScore}/100` : "—"}
          icon={<Gauge size={16} className="text-emerald-500" />}
        />
      </div>

      {openNcs.length > 0 && (
        <Card className="mb-4 border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
              <AlertTriangle size={16} /> Não-conformidades aguardando ação
            </h2>
            <Link
              href="/fornecedor/qualidade"
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:underline dark:text-amber-300"
            >
              Responder <ArrowRight size={13} />
            </Link>
          </div>
          <ul className="space-y-1 text-sm text-amber-900 dark:text-amber-200">
            {openNcs.slice(0, 4).map((n) => (
              <li key={n.id}>
                <strong>{n.ncNumber}</strong> — {n.description}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <NavCard href="/fornecedor/pedidos" label="Meus Pedidos" desc="Acompanhe seus pedidos de compra" />
        <NavCard href="/fornecedor/embarques" label="Embarques" desc="Rastreie suas entregas" />
        <NavCard href="/fornecedor/desempenho" label="Desempenho" desc="Seu scorecard e avaliações" />
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
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
      {hint && <div className="mt-0.5 text-[11px] text-neutral-400">{hint}</div>}
    </Card>
  );
}

function NavCard({ href, label, desc }: { href: string; label: string; desc: string }) {
  return (
    <Link href={href}>
      <Card className="p-5 transition hover:border-indigo-300 hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-semibold">{label}</span>
          <ArrowRight size={16} className="text-neutral-400" />
        </div>
        <p className="mt-1 text-xs text-neutral-500">{desc}</p>
      </Card>
    </Link>
  );
}

export const dynamic = "force-dynamic";
