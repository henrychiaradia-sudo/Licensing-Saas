import { requireSession } from "@/lib/auth";
import { listInfluencers } from "@/lib/data/marketing-registry";
import { Card } from "@/components/ui";
import { fmtBRL } from "@/lib/utils";
import { AtSign, Users } from "lucide-react";
import { MarketingNav } from "../nav";
import { InfluencerForm } from "./influencer-form";

function fmtInt(n: number | string | null) {
  if (n == null) return "—";
  return new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(
    Number(n),
  );
}

export default async function InfluencersPage() {
  const session = await requireSession();
  const rows = await listInfluencers(session.tenantId);

  return (
    <div>
      <div className="mb-1">
        <h1 className="text-xl font-bold">Influenciadores</h1>
        <p className="text-sm text-neutral-500">
          Base de criadores para ações de influência, com alcance e cachê.
        </p>
      </div>

      <MarketingNav />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h2 className="mb-4 text-sm font-semibold">Novo influenciador</h2>
          <InfluencerForm />
        </Card>

        <div className="lg:col-span-2">
          {rows.length === 0 ? (
            <Card className="p-8 text-center text-sm text-neutral-400">
              Nenhum influenciador cadastrado.
            </Card>
          ) : (
            <Card className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                      <th className="px-4 py-2.5 font-medium">Nome</th>
                      <th className="px-4 py-2.5 font-medium">Plataforma</th>
                      <th className="px-4 py-2.5 font-medium">Segmento</th>
                      <th className="px-4 py-2.5 text-right font-medium">Seguidores</th>
                      <th className="px-4 py-2.5 text-right font-medium">Cachê</th>
                      <th className="px-4 py-2.5 text-right font-medium">Alcance entreg.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((i) => (
                      <tr key={i.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                        <td className="px-4 py-2.5">
                          <div className="font-medium">{i.name}</div>
                          {i.handle && (
                            <div className="flex items-center gap-0.5 text-xs text-neutral-400">
                              <AtSign size={11} />
                              {i.handle.replace(/^@/, "")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-500">{i.platform ?? "—"}</td>
                        <td className="px-4 py-2.5 text-neutral-500">{i.segment ?? "—"}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          <span className="inline-flex items-center gap-1">
                            <Users size={12} className="text-neutral-400" />
                            {fmtInt(i.followers)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {i.fee != null ? fmtBRL(Number(i.fee)) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-neutral-500">
                          {fmtInt(i.reachDelivered)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
