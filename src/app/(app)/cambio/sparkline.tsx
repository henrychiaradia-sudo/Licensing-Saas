/** Minigráfico de linha (SVG puro) para a evolução da taxa. Server component. */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  color = "#2563eb",
}: {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!values.length) return <span className="text-[11px] text-neutral-300">—</span>;
  if (values.length === 1) {
    return (
      <svg width={width} height={height} className="overflow-visible">
        <circle cx={width / 2} cy={height / 2} r={2} fill={color} />
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const up = values[values.length - 1] >= values[0];
  const stroke = color ?? (up ? "#10b981" : "#ef4444");
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={(values.length - 1) * stepX}
        cy={height - ((values[values.length - 1] - min) / span) * (height - 4) - 2}
        r={2}
        fill={stroke}
      />
    </svg>
  );
}
