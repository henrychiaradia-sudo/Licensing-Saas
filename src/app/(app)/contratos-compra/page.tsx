import Link from "next/link";
import { FileSignature, Plus, Wallet, TrendingDown, CheckCircle2 } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listPurchaseContracts, purchaseContractSummary } from "@/lib/data/purchase-contracts";
import { Card, Badge, Button, StatCard } from "@/components/ui";
import { ProgressBar } from "@/components/charts";
import { fmtMoney, fmtCompactBRL, fmtDate, cn } from "@/lib/utils";
import type { PurchaseContractStatus } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";
export const pcTone: Record<PurchaseContractStatus, Tone> = {
  rascunho: "neutral",
  vigente: "good",
  suspenso: "warn",
  encerrado: "neutral",
};
export const pcLabel: Record<PurchaseContractStatus, string> = {
  rascunho: "Rascunho",
  vigente: "Vigente",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
};

export default async function ContratosCompraPage() {
  const session = await requireSession();
  const [contracts, summary] = await Promise.all([
    listPurchaseContracts(session.tenantId),
    purchaseContractSummary(session.tenantId),
  ]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <FileSignature size={20} className="text-blue-600" /> Contratos de Compra
          </h1>
          <p className="text-sm text-neutral-500">
            Compromissos de compra que os pedidos consomem — com saldo por contrato
          </p>
        </div>
        <Link href="/contratos-compra/new">
          <Button>
            <Plus size={16} /> Novo contrato
          </Button>
        </Link>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Contratos vigentes"
          value={String(summary.active)}
          hint={`${summary.total} no total`}
          icon={<CheckCircle2 size={20} />}
          tone="blue"
        />
        <StatCard
          label="Valor comprometido"
          value={fmtCompactBRL(summary.committed)}
          hint="Contratos vigentes"
          icon={<FileSignature size={20} />}
          tone="violet"
        />
        <StatCard
          label="Consumido"
          value={fmtCompactBRL(summary.consumed)}
          hint={`${summary.utilizationPct}% do comprometido`}
          icon={<TrendingDown size={20} />}
          tone="amber"
        />
        <StatCard
          label="Saldo disponível"
          value={fmtCompactBRL(summary.available)}
          hint="Comprometido − consumido"
          icon={<Wallet size={20} />}
          tone={summary.available >= 0 ? "emerald" : "red"}
        />
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                <th className="px-5 py-2 font-medium">Contrato</th>
                <th className="px-5 py-2 font-medium">Fornecedor</th>
                <th className="px-5 py-2 text-right font-medium">Comprometido</th>
                <th className="px-5 py-2 text-right font-medium">Consumido</th>
                <th className="px-5 py-2 text-right font-medium">Saldo</th>
                <th className="px-5 py-2 pl-4 font-medium">Uso</th>
                <th className="px-5 py-2 text-right font-medium">Vigência</th>
                <th className="px-5 py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="px-5 py-3">
                    <Link
                      href={`/contratos-compra/${c.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {c.contractNumber}
                    </Link>
                    <div className="text-xs text-neutral-400">{c.title}</div>
                  </td>
                  <td className="px-5 py-3 text-neutral-600 dark:text-neutral-300">{c.supplierName ?? "—"}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{fmtMoney(c.committed, c.currency)}</td>
                  <td className="px-5 py-3 text-right tabular-nums text-amber-600">
                    {c.consumed > 0 ? fmtMoney(c.consumed, c.currency) : "—"}
                    {c.poCount > 0 && <div className="text-[11px] text-neutral-400">{c.poCount} pedido(s)</div>}
                  </td>
                  <td
                    className={cn(
                      "px-5 py-3 text-right font-medium tabular-nums",
                      c.available < 0 ? "text-red-600" : "text-emerald-600",
                    )}
                  >
                    {fmtMoney(c.available, c.currency)}
                  </td>
                  <td className="px-5 py-3 pl-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20">
                        <ProgressBar pct={c.utilizationPct} />
                      </div>
                      <span className="text-xs tabular-nums text-neutral-500">{c.utilizationPct}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right text-xs text-neutral-500">
                    {fmtDate(c.startDate)} – {fmtDate(c.endDate)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Badge tone={pcTone[c.status]}>{pcLabel[c.status]}</Badge>
                  </td>
                </tr>
              ))}
              {contracts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-neutral-400">
                    Nenhum contrato de compra. Crie o primeiro para vincular pedidos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
