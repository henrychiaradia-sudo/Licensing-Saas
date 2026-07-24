import { Card } from "@/components/ui";
import { fmtMoney } from "@/lib/utils";
import { computeRoyalty, type RoyaltyRuleInput, type TierInput } from "@/lib/royalties-engine";

const typeLabel: Record<string, string> = {
  percentual: "Percentual",
  fixo: "Valor fixo",
  hibrido: "Híbrido",
  escalonado: "Escalonado (faixas)",
};

/** Mostra como o royalty foi apurado a partir da base (com faixas, piso e teto). */
export function RoyaltyBreakdown({
  rule,
  tiers,
  base,
  iso,
  storedRoyalty,
}: {
  rule: RoyaltyRuleInput | null;
  tiers: TierInput[];
  base: number;
  iso: string;
  /** Valor apurado do reporte; se divergir do recálculo (regra mudou depois), o detalhamento é omitido. */
  storedRoyalty?: number;
}) {
  if (!rule) return null;
  const comp = computeRoyalty(base, rule, tiers);
  if (
    storedRoyalty != null &&
    Math.abs(comp.royalty - storedRoyalty) > Math.max(1, Math.abs(storedRoyalty) * 0.001)
  ) {
    return null; // regra atual não corresponde à do reporte — evita confundir
  }

  return (
    <Card className="mt-4 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Cálculo do royalty</h2>
        <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {typeLabel[rule.royaltyType] ?? rule.royaltyType}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="py-2 pr-4 font-medium">Faixa</th>
              <th className="py-2 pr-4 text-right font-medium">Base</th>
              <th className="py-2 pr-4 text-right font-medium">Alíquota</th>
              <th className="py-2 text-right font-medium">Royalty</th>
            </tr>
          </thead>
          <tbody>
            {comp.breakdown.map((b, i) => (
              <tr key={i} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="py-2 pr-4 tabular-nums text-neutral-600 dark:text-neutral-300">
                  {fmtMoney(b.from, iso)} — {b.to == null ? "acima" : fmtMoney(b.to, iso)}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{fmtMoney(b.portion, iso)}</td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {b.ratePct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
                </td>
                <td className="py-2 text-right font-medium tabular-nums">{fmtMoney(b.amount, iso)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-neutral-200 dark:border-neutral-800">
              <td className="py-2 pr-4 font-semibold">Total</td>
              <td className="py-2 pr-4 text-right tabular-nums">{fmtMoney(comp.base, iso)}</td>
              <td className="py-2 pr-4 text-right tabular-nums text-neutral-500">
                {(comp.effectiveRate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% ef.
              </td>
              <td className="py-2 text-right font-bold tabular-nums">{fmtMoney(comp.royalty, iso)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      {(comp.minApplied || comp.maxApplied) && (
        <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
          {comp.minApplied ? "Piso mínimo contratual aplicado. " : ""}
          {comp.maxApplied ? "Teto máximo contratual aplicado." : ""}
        </p>
      )}
    </Card>
  );
}
