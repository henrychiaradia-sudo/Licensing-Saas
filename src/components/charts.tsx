import { cn } from "@/lib/utils";

/* Paleta consistente para os gráficos (CSS puro, sem libs). */
export const CHART_COLORS = [
  "#2563eb", // ALIANZA blue (primary)
  "#06b6d4", // ALIANZA cyan
  "#7c3aed", // ALIANZA purple accent
  "#10b981", // emerald (success)
  "#f59e0b", // amber (warning)
  "#ef4444", // red (error)
  "#0ea5e9", // sky
  "#8b5cf6", // violet
];

type Item = { key?: string; label: string; value: number };

/* --------------------------- Barras horizontais --------------------------- */
export function BarList({
  items,
  format = (n) => n.toLocaleString("pt-BR"),
  colorFrom = 0,
  emptyLabel = "Sem dados no período.",
}: {
  items: Item[];
  format?: (n: number) => string;
  colorFrom?: number;
  emptyLabel?: string;
}) {
  if (!items.length) return <p className="py-6 text-center text-sm text-neutral-400">{emptyLabel}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2.5">
      {items.map((it, idx) => {
        const pct = Math.max(2, Math.round((it.value / max) * 100));
        const color = CHART_COLORS[(idx + colorFrom) % CHART_COLORS.length];
        return (
          <div key={it.key ?? it.label}>
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium text-neutral-600 dark:text-neutral-300">
                {it.label}
              </span>
              <span className="shrink-0 tabular-nums text-neutral-500">{format(it.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------- Donut (pizza) ------------------------------ */
export function Donut({
  items,
  format = (n) => n.toLocaleString("pt-BR"),
  centerLabel,
  centerValue,
}: {
  items: Item[];
  format?: (n: number) => string;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total <= 0)
    return <p className="py-6 text-center text-sm text-neutral-400">Sem dados no período.</p>;
  let acc = 0;
  const stops = items
    .map((it, idx) => {
      const from = (acc / total) * 100;
      acc += it.value;
      const to = (acc / total) * 100;
      const color = CHART_COLORS[idx % CHART_COLORS.length];
      return `${color} ${from}% ${to}%`;
    })
    .join(", ");
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-36 w-36 shrink-0">
        <div className="h-36 w-36 rounded-full" style={{ background: `conic-gradient(${stops})` }} />
        <div className="absolute inset-[18%] grid place-items-center rounded-full bg-white text-center dark:bg-neutral-900">
          <div>
            <div className="text-lg font-bold leading-none tabular-nums">{centerValue ?? format(total)}</div>
            {centerLabel && <div className="mt-0.5 text-[10px] text-neutral-400">{centerLabel}</div>}
          </div>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5 text-sm">
        {items.map((it, idx) => (
          <li key={it.key ?? it.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
              />
              <span className="text-neutral-600 dark:text-neutral-300">{it.label}</span>
            </span>
            <span className="tabular-nums text-neutral-500">
              {format(it.value)}
              <span className="ml-1 text-[11px] text-neutral-400">
                ({Math.round((it.value / total) * 100)}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------- Barras agrupadas: orçado × realizado --------------------- */
export function GroupedBars({
  rows,
  format = (n) => n.toLocaleString("pt-BR"),
}: {
  rows: { label: string; sublabel?: string | null; a: number; b: number }[];
  format?: (n: number) => string;
}) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-neutral-400">Sem dados.</p>;
  const max = Math.max(...rows.flatMap((r) => [r.a, r.b]), 1);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[0] }} /> Orçado
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[1] }} /> Realizado
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
            <span className="truncate font-medium text-neutral-600 dark:text-neutral-300">{r.label}</span>
            <span className="shrink-0 tabular-nums text-neutral-400">
              {format(r.b)} / {format(r.a)}
            </span>
          </div>
          <div className="space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-2 rounded-full"
                style={{ width: `${Math.max(2, (r.a / max) * 100)}%`, backgroundColor: CHART_COLORS[0] }}
              />
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div
                className="h-2 rounded-full"
                style={{ width: `${Math.max(2, (r.b / max) * 100)}%`, backgroundColor: CHART_COLORS[1] }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ----------------------- Barra proporcional (2 segmentos) ----------------------- */
export function SplitBar({
  a,
  b,
  aLabel,
  bLabel,
  format = (n) => n.toLocaleString("pt-BR"),
}: {
  a: number;
  b: number;
  aLabel: string;
  bLabel: string;
  format?: (n: number) => string;
}) {
  const total = a + b;
  const aPct = total > 0 ? (a / total) * 100 : 50;
  const bPct = 100 - aPct;
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div style={{ width: `${aPct}%`, backgroundColor: CHART_COLORS[0] }} />
        <div style={{ width: `${bPct}%`, backgroundColor: CHART_COLORS[2] }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[0] }} />
          {aLabel} <span className="tabular-nums text-neutral-500">{format(a)}</span>
        </span>
        <span className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[2] }} />
          {bLabel} <span className="tabular-nums text-neutral-500">{format(b)}</span>
        </span>
      </div>
    </div>
  );
}

/* ----------------------- Colunas verticais (tendência mensal) ----------------------- */
export function ColumnTrend({
  rows,
  format = (n) => n.toLocaleString("pt-BR"),
}: {
  rows: { label: string; a: number; b: number }[];
  format?: (n: number) => string;
}) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-neutral-400">Sem dados datados.</p>;
  const max = Math.max(...rows.flatMap((r) => [r.a, r.b]), 1);
  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-[11px] text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[0] }} /> Gasto
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: CHART_COLORS[1] }} /> Receita
        </span>
      </div>
      <div className="flex items-end gap-3">
        {rows.map((r) => (
          <div key={r.label} className="flex flex-1 flex-col items-center">
            <div className="flex h-40 w-full items-end justify-center gap-1">
              <div
                className="w-1/2 rounded-t"
                style={{ height: `${Math.max(2, (r.a / max) * 100)}%`, backgroundColor: CHART_COLORS[0] }}
                title={`Gasto ${format(r.a)}`}
              />
              <div
                className="w-1/2 rounded-t"
                style={{ height: `${Math.max(2, (r.b / max) * 100)}%`, backgroundColor: CHART_COLORS[1] }}
                title={`Receita ${format(r.b)}`}
              />
            </div>
            <span className="mt-1.5 text-[10px] text-neutral-400">{r.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Barra de progresso ------------------------------ */
export function ProgressBar({
  pct,
  className,
  positive = false,
}: {
  pct: number;
  className?: string;
  /** Quando true, ultrapassar 100% é bom (KPIs) — não pinta de vermelho. */
  positive?: boolean;
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800", className)}>
      <div
        className={cn(
          "h-2 rounded-full",
          !positive && pct > 100 ? "bg-red-500" : "bg-gradient-to-r from-blue-600 to-cyan-500",
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
