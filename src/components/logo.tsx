import { cn } from "@/lib/utils";

/**
 * Marca ALIANZA — "A" angular com traço em swoosh, no gradiente oficial (azul → ciano).
 * tone: "gradient" (padrão), "white" (para usar sobre o gradiente) ou "navy".
 */
export function AlianzaMark({
  size = 28,
  tone = "gradient",
  className,
}: {
  size?: number;
  tone?: "gradient" | "white" | "navy";
  className?: string;
}) {
  const stroke =
    tone === "white" ? "#ffffff" : tone === "navy" ? "#081221" : "url(#alz-mark-grad)";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="alz-mark-grad" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <path
        d="M9 40 L24 8 L39 40"
        stroke={stroke}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 29 Q24 24 32.5 29"
        stroke={stroke}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Tile do ícone do app: quadrado com gradiente e a marca em branco. */
export function AlianzaTile({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("grid place-items-center rounded-xl alz-gradient shadow-sm", className)}
      style={{ width: size, height: size }}
    >
      <AlianzaMark size={Math.round(size * 0.62)} tone="white" />
    </span>
  );
}

/**
 * Logo completo: tile + wordmark "ALIANZA" (+ subtítulo opcional).
 * Usado em sidebar, login, landing e portais.
 */
export function AlianzaLogo({
  subtitle = false,
  tileSize = 34,
  className,
  wordClassName,
}: {
  subtitle?: boolean;
  tileSize?: number;
  className?: string;
  wordClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <AlianzaTile size={tileSize} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-bold tracking-[0.18em] text-slate-900 dark:text-white",
            wordClassName,
          )}
        >
          ALIANZA
        </span>
        {subtitle && (
          <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.28em] text-slate-400">
            Brand Licensing Platform
          </span>
        )}
      </span>
    </span>
  );
}
