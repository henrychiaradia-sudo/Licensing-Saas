import { cn } from "@/lib/utils";

/* ============================================================================
 * charts-pro — biblioteca de visualização estilo Power BI / central de controle
 * SVG + CSS puro (sem libs, sem client JS). Pensada para fundo escuro.
 * ==========================================================================*/

export const PAL = {
  blue: "#3b82f6",
  cyan: "#22d3ee",
  violet: "#a855f7",
  emerald: "#34d399",
  amber: "#fbbf24",
  pink: "#f472b6",
  red: "#f87171",
  indigo: "#818cf8",
  teal: "#2dd4bf",
  orange: "#fb923c",
  lime: "#a3e635",
  sky: "#38bdf8",
};
export const SERIES = [
  PAL.cyan,
  PAL.violet,
  PAL.amber,
  PAL.emerald,
  PAL.pink,
  PAL.blue,
  PAL.orange,
  PAL.lime,
  PAL.indigo,
  PAL.red,
];

type Item = { label: string; value: number; color?: string };

/* ------------------------------ Painel (glass) ------------------------------ */
export function Panel({
  title,
  subtitle,
  icon,
  right,
  accent = PAL.cyan,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  accent?: string;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-[0_2px_20px_rgba(0,0,0,0.3)] backdrop-blur-sm",
        className,
      )}
    >
      <span
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent 75%)` }}
      />
      {(title || right) && (
        <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
          <div className="flex items-center gap-2">
            {icon && (
              <span
                className="grid h-7 w-7 place-items-center rounded-lg"
                style={{ backgroundColor: `${accent}22`, color: accent }}
              >
                {icon}
              </span>
            )}
            <div>
              {title && <h3 className="text-[13px] font-semibold text-white">{title}</h3>}
              {subtitle && <p className="text-[11px] text-slate-400">{subtitle}</p>}
            </div>
          </div>
          {right}
        </div>
      )}
      <div className={cn("px-4 pb-4 pt-3", bodyClassName)}>{children}</div>
    </div>
  );
}

/* ------------------------------ Sparkline ------------------------------ */
export function Sparkline({
  data,
  color = PAL.cyan,
  className,
}: {
  data: number[];
  color?: string;
  className?: string;
}) {
  const n = data.length;
  if (n < 2) return <div className={cn("h-8", className)} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (n - 1)) * 100;
    const y = 28 - ((v - min) / span) * 24 - 2;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const id = `sp-${color.replace("#", "")}-${n}`;
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={cn("h-8 w-full", className)}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,30 ${pts.join(" ")} 100,30`} fill={`url(#${id})`} />
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ------------------------------ KPI tile ------------------------------ */
export function Kpi({
  label,
  value,
  sub,
  icon,
  accent = PAL.cyan,
  delta,
  spark,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  accent?: string;
  delta?: { label: string; positive: boolean } | null;
  spark?: number[];
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-sm">
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full opacity-20 blur-2xl"
        style={{ backgroundColor: accent }}
      />
      <div className="flex items-start justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
        {icon && (
          <span
            className="grid h-8 w-8 place-items-center rounded-lg"
            style={{ backgroundColor: `${accent}22`, color: accent }}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-[26px] font-bold leading-none tracking-tight text-white tabular-nums">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              "mb-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold",
              delta.positive
                ? "bg-emerald-400/15 text-emerald-300"
                : "bg-red-400/15 text-red-300",
            )}
          >
            {delta.positive ? "▲" : "▼"} {delta.label}
          </span>
        )}
      </div>
      {sub && <p className="mt-1 text-[11px] text-slate-400">{sub}</p>}
      {spark && spark.length > 1 && <Sparkline data={spark} color={accent} className="mt-3" />}
    </div>
  );
}

/* ------------------------ Área / linha multi-série ------------------------ */
export function AreaLineChart({
  series,
  labels,
  height = 220,
  format = (n) => n.toLocaleString("pt-BR"),
}: {
  series: { name: string; color: string; data: number[] }[];
  labels: string[];
  height?: number;
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...series.flatMap((s) => s.data));
  const n = labels.length;
  const toPts = (data: number[]) =>
    data
      .map((v, i) => {
        const x = n > 1 ? (i / (n - 1)) * 100 : 0;
        const y = 100 - (v / max) * 92 - 4;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-[11px] text-slate-300">
            <span className="h-2 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
            {s.name}
          </span>
        ))}
        <span className="ml-auto text-[10.5px] text-slate-500">máx {format(max)}</span>
      </div>
      <div className="relative w-full" style={{ height }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
          <defs>
            {series.map((s, i) => (
              <linearGradient key={i} id={`al-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>
          {[20, 40, 60, 80].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {series.map((s, i) => (
            <polygon key={`a${i}`} points={`0,100 ${toPts(s.data)} 100,100`} fill={`url(#al-${i})`} />
          ))}
          {series.map((s, i) => (
            <polyline
              key={`l${i}`}
              points={toPts(s.data)}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-slate-500">
        {labels.map((l, i) => (
          <span key={i} className={cn(n > 8 && i % 2 !== 0 && "hidden sm:inline")}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Donut ------------------------------ */
export function DonutChart({
  items,
  size = 160,
  thickness = 22,
  centerValue,
  centerLabel,
  format = (n) => n.toLocaleString("pt-BR"),
}: {
  items: Item[];
  size?: number;
  thickness?: number;
  centerValue?: string;
  centerLabel?: string;
  format?: (n: number) => string;
}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={thickness} />
          {total > 0 &&
            items.map((it, i) => {
              const frac = it.value / total;
              const len = frac * c;
              const el = (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={it.color ?? SERIES[i % SERIES.length]}
                  strokeWidth={thickness}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-acc}
                  strokeLinecap="butt"
                />
              );
              acc += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-xl font-bold leading-none text-white tabular-nums">
              {centerValue ?? format(total)}
            </div>
            {centerLabel && <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{centerLabel}</div>}
          </div>
        </div>
      </div>
      <ul className="min-w-[140px] flex-1 space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center justify-between gap-3 text-[12.5px]">
            <span className="flex items-center gap-2 text-slate-300">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: it.color ?? SERIES[i % SERIES.length] }} />
              {it.label}
            </span>
            <span className="tabular-nums text-slate-400">
              {format(it.value)}
              {total > 0 && <span className="ml-1 text-[10.5px] text-slate-500">{Math.round((it.value / total) * 100)}%</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------- Anel radial (progresso) ------------------------- */
export function RadialGauge({
  pct,
  label,
  value,
  color = PAL.cyan,
  size = 130,
}: {
  pct: number;
  label?: string;
  value?: string;
  color?: string;
  size?: number;
}) {
  const thickness = 12;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const len = (clamped / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={thickness} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={thickness}
            strokeDasharray={`${len} ${c - len}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-2xl font-bold leading-none text-white tabular-nums">{value ?? `${Math.round(pct)}%`}</div>
            {label && <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">{label}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- Barras horizontais --------------------------- */
export function HBars({
  items,
  format = (n) => n.toLocaleString("pt-BR"),
  colorful = true,
  max: maxProp,
}: {
  items: Item[];
  format?: (n: number) => string;
  colorful?: boolean;
  max?: number;
}) {
  if (!items.length) return <p className="py-6 text-center text-[13px] text-slate-500">Sem dados no período.</p>;
  const max = maxProp ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => {
        const color = it.color ?? (colorful ? SERIES[i % SERIES.length] : PAL.cyan);
        const pct = Math.max(2, Math.round((it.value / max) * 100));
        return (
          <div key={i}>
            <div className="mb-1 flex items-center justify-between gap-2 text-[12px]">
              <span className="truncate text-slate-300">{it.label}</span>
              <span className="shrink-0 tabular-nums text-slate-400">{format(it.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-2 rounded-full"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}bb)` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* --------------------------- Colunas empilhadas --------------------------- */
export function StackedBars({
  groups,
  keys,
  height = 200,
  format = (n) => n.toLocaleString("pt-BR"),
}: {
  groups: { label: string; values: number[] }[];
  keys: { name: string; color: string }[];
  height?: number;
  format?: (n: number) => string;
}) {
  if (!groups.length) return <p className="py-6 text-center text-[13px] text-slate-500">Sem dados.</p>;
  const totals = groups.map((g) => g.values.reduce((a, b) => a + b, 0));
  const max = Math.max(...totals, 1);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {keys.map((k) => (
          <span key={k.name} className="flex items-center gap-1.5 text-[11px] text-slate-300">
            <span className="h-2 w-2.5 rounded-sm" style={{ backgroundColor: k.color }} />
            {k.name}
          </span>
        ))}
      </div>
      <div className="flex items-end gap-2" style={{ height }}>
        {groups.map((g, gi) => {
          const total = totals[gi];
          return (
            <div key={gi} className="flex h-full flex-1 flex-col items-center justify-end">
              <span className="mb-1 text-[10px] font-semibold text-slate-300 tabular-nums">{format(total)}</span>
              <div
                className="flex w-full max-w-[46px] flex-col-reverse overflow-hidden rounded-md"
                style={{ height: `${Math.max(3, (total / max) * 100)}%` }}
              >
                {g.values.map((v, ki) => (
                  <div
                    key={ki}
                    style={{
                      height: `${total > 0 ? (v / total) * 100 : 0}%`,
                      backgroundColor: keys[ki % keys.length].color,
                    }}
                    title={`${keys[ki % keys.length].name}: ${format(v)}`}
                  />
                ))}
              </div>
              <span className="mt-1.5 max-w-[64px] truncate text-[10px] text-slate-400">{g.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ Scatter ------------------------------ */
export function ScatterChart({
  points,
  xLabel,
  yLabel,
  format = (n) => n.toLocaleString("pt-BR"),
  height = 260,
}: {
  points: { x: number; y: number; r?: number; color?: string; label?: string }[];
  xLabel?: string;
  yLabel?: string;
  format?: (n: number) => string;
  height?: number;
}) {
  if (!points.length) return <p className="py-6 text-center text-[13px] text-slate-500">Sem dados.</p>;
  const xMax = Math.max(...points.map((p) => p.x), 1);
  const yMax = Math.max(...points.map((p) => p.y), 1);
  const W = 300;
  const H = 220;
  const padL = 8;
  const padB = 8;
  return (
    <div>
      <div className="relative w-full" style={{ height }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full">
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <line key={f} x1={padL} y1={H - padB - f * (H - padB)} x2={W} y2={H - padB - f * (H - padB)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          ))}
          {points.map((p, i) => {
            const cx = padL + (p.x / xMax) * (W - padL - 6);
            const cy = H - padB - (p.y / yMax) * (H - padB - 6);
            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={p.r ?? 5}
                fill={p.color ?? SERIES[i % SERIES.length]}
                fillOpacity="0.65"
                stroke={p.color ?? SERIES[i % SERIES.length]}
                strokeWidth="1"
              >
                {p.label && <title>{`${p.label} — ${format(p.x)} / ${format(p.y)}`}</title>}
              </circle>
            );
          })}
        </svg>
      </div>
      <div className="mt-1 flex items-center justify-between text-[10.5px] text-slate-500">
        <span>{yLabel}</span>
        <span>{xLabel} →</span>
      </div>
    </div>
  );
}

/* ------------------------- Linha de estatística ------------------------- */
export function MiniStat({
  label,
  value,
  accent = PAL.cyan,
  icon,
}: {
  label: string;
  value: string;
  accent?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      {icon && (
        <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ backgroundColor: `${accent}22`, color: accent }}>
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <div className="truncate text-[16px] font-bold leading-tight text-white tabular-nums">{value}</div>
        <div className="truncate text-[10.5px] text-slate-400">{label}</div>
      </div>
    </div>
  );
}

/* ----------------------------- Tabela mini ----------------------------- */
export function DataTable({
  columns,
  rows,
}: {
  columns: { key: string; label: string; align?: "left" | "right" }[];
  rows: Record<string, React.ReactNode>[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="border-b border-white/10 text-left text-[10px] uppercase tracking-wide text-slate-500">
            {columns.map((c) => (
              <th key={c.key} className={cn("px-2 py-2 font-medium", c.align === "right" && "text-right")}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-white/[0.06] last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-2 py-2 text-slate-300", c.align === "right" && "text-right tabular-nums")}>
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-2 py-6 text-center text-slate-500">
                Sem dados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
