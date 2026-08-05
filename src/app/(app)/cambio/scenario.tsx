"use client";

import { useState } from "react";
import { fmtBRL, cn } from "@/lib/utils";

type Row = { isoCode: string; unhedgedNative: number; rate: number; netBase: number };

const SHOCKS = [-15, -10, -5, 0, 5, 10, 15];

/**
 * Simulador de choque cambial: aplica variação % nas moedas estrangeiras e
 * mostra o impacto (em BRL) sobre a exposição líquida NÃO coberta por hedge.
 */
export function Scenario({ rows }: { rows: Row[] }) {
  const [shock, setShock] = useState(10);
  const factor = 1 + shock / 100;

  const impacted = rows.map((r) => {
    const newBase = r.unhedgedNative * r.rate * factor;
    return { ...r, newBase, delta: newBase - r.netBase };
  });
  const totalNet = rows.reduce((s, r) => s + r.netBase, 0);
  const totalNew = impacted.reduce((s, r) => s + r.newBase, 0);
  const totalDelta = totalNew - totalNet;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {SHOCKS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setShock(s)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-sm font-medium tabular-nums transition-colors",
              shock === s
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-neutral-200 text-neutral-600 hover:border-blue-400 dark:border-neutral-700 dark:text-neutral-300",
            )}
          >
            {s > 0 ? `+${s}` : s}%
          </button>
        ))}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="text-xs text-neutral-400">Exposição líquida atual</div>
          <div className="mt-1 text-lg font-bold tabular-nums">{fmtBRL(totalNet)}</div>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <div className="text-xs text-neutral-400">
            No cenário {shock > 0 ? `+${shock}` : shock}%
          </div>
          <div className="mt-1 text-lg font-bold tabular-nums">{fmtBRL(totalNew)}</div>
        </div>
        <div
          className={cn(
            "rounded-xl border p-4",
            totalDelta > 0
              ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
              : totalDelta < 0
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                : "border-neutral-200 dark:border-neutral-800",
          )}
        >
          <div className="text-xs text-neutral-400">Impacto no custo</div>
          <div
            className={cn(
              "mt-1 text-lg font-bold tabular-nums",
              totalDelta > 0 ? "text-red-600" : totalDelta < 0 ? "text-emerald-600" : "",
            )}
          >
            {totalDelta > 0 ? "+" : ""}
            {fmtBRL(totalDelta)}
          </div>
        </div>
      </div>

      {impacted.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                <th scope="col" className="py-2 pr-4 font-medium">Moeda</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Exposição líquida</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">No cenário</th>
                <th scope="col" className="py-2 text-right font-medium">Impacto</th>
              </tr>
            </thead>
            <tbody>
              {impacted.map((r) => (
                <tr key={r.isoCode} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                  <td className="py-2 pr-4 font-medium">{r.isoCode}</td>
                  <td className="py-2 pr-4 text-right tabular-nums text-neutral-500">{fmtBRL(r.netBase)}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{fmtBRL(r.newBase)}</td>
                  <td
                    className={cn(
                      "py-2 text-right font-medium tabular-nums",
                      r.delta > 0 ? "text-red-600" : r.delta < 0 ? "text-emerald-600" : "text-neutral-400",
                    )}
                  >
                    {r.delta > 0 ? "+" : ""}
                    {fmtBRL(r.delta)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-neutral-400">Sem exposição líquida para simular.</p>
      )}
      <p className="mt-3 text-[11px] text-neutral-400">
        Simulação sobre a parcela <strong>não coberta por hedge</strong>. Choque positivo = moeda
        estrangeira se valoriza frente ao BRL (custo maior para o importador).
      </p>
    </div>
  );
}
