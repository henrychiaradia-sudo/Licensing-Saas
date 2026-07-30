import { Star, Package, FileText } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { listPortalBrands } from "@/lib/data/portal-insights";
import { Card, Badge } from "@/components/ui";
import type { NotifTone } from "@/lib/notif-meta";

function statusTone(s: string): NotifTone {
  const v = s.toLowerCase();
  if (/(ativ|vigente)/.test(v)) return "good";
  if (/(inativ|suspens|encerr)/.test(v)) return "neutral";
  return "info";
}

export default async function MinhasMarcasPage() {
  const session = await requireLicenseeSession();
  const brands = await listPortalBrands(session.tenantId, session.licenseeId);

  return (
    <div>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Star size={20} className="text-emerald-600" /> Minhas Marcas
        </h1>
        <p className="text-sm text-neutral-500">
          As marcas que você está licenciado a comercializar, conforme seus contratos.
        </p>
      </div>

      {brands.length === 0 ? (
        <Card className="p-10 text-center text-sm text-neutral-400">
          Nenhuma marca licenciada encontrada nos seus contratos.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((b) => (
            <Card key={b.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-sm font-bold text-white">
                    {b.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <div className="font-semibold">{b.name}</div>
                    <div className="text-[11px] text-neutral-400">{b.code}</div>
                  </div>
                </div>
                <Badge tone={statusTone(b.status)}>{b.status}</Badge>
              </div>
              <div className="mt-4 flex items-center gap-4 text-[13px] text-neutral-500">
                <span className="inline-flex items-center gap-1.5">
                  <Package size={14} className="text-neutral-400" /> {b.products} produto(s)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <FileText size={14} className="text-neutral-400" /> {b.contracts} contrato(s)
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
