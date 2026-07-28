import { requireSession } from "@/lib/auth";
import { listAgencies } from "@/lib/data/marketing-registry";
import { Card, Badge } from "@/components/ui";
import { fmtBRL } from "@/lib/utils";
import { Mail, Phone, User } from "lucide-react";
import { MarketingNav } from "../nav";
import { AgencyForm } from "./agency-form";
import { agencyTypeLabel } from "../labels";

export default async function AgenciesPage() {
  const session = await requireSession();
  const rows = await listAgencies(session.tenantId);

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold">Agências & parceiros</h1>
        <p className="text-sm text-neutral-500">
          Cadastro de agências de criação, mídia, digital, PR, eventos e produção.
        </p>
      </div>

      <MarketingNav />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold">Nova agência</h2>
          <AgencyForm />
        </Card>

        <div className="lg:col-span-2">
          {rows.length === 0 ? (
            <Card className="p-8 text-center text-sm text-neutral-400">Nenhuma agência cadastrada.</Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {rows.map((a) => (
                <Card key={a.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{a.name}</div>
                      <Badge tone="info" className="mt-1">
                        {agencyTypeLabel[a.agencyType]}
                      </Badge>
                    </div>
                    <div className="text-right text-xs text-neutral-400">
                      <div className="tabular-nums">{Number(a.actionsCount)} ações</div>
                      <div className="tabular-nums">{fmtBRL(Number(a.invested))}</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-neutral-500">
                    {a.contactName && (
                      <div className="flex items-center gap-1.5">
                        <User size={12} /> {a.contactName}
                      </div>
                    )}
                    {a.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail size={12} /> {a.email}
                      </div>
                    )}
                    {a.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} /> {a.phone}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
