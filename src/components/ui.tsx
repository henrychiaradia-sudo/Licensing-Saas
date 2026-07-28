import * as React from "react";
import { cn } from "@/lib/utils";

/* ---------------- Button ---------------- */
type ButtonProps = React.ComponentProps<"button"> & {
  variant?: "primary" | "gradient" | "outline" | "ghost" | "danger";
  size?: "sm" | "md";
};
export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 border border-blue-600",
    gradient: "alz-gradient text-white border border-transparent hover:opacity-90 shadow-sm",
    outline:
      "bg-white text-neutral-800 border border-neutral-200 hover:border-blue-500 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700",
    ghost: "bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200",
    danger: "bg-red-600 text-white hover:bg-red-700 border border-red-600",
  };
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-9 px-4 text-sm" };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

/* ---------------- Input / Textarea / Label / Select ---------------- */
const fieldBase =
  "w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(fieldBase, className)} {...props} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(fieldBase, "pr-8", className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(fieldBase, "min-h-20", className)} {...props} />;
  },
);

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn("mb-1.5 block text-xs font-medium text-neutral-600 dark:text-neutral-300", className)}
      {...props}
    />
  );
}

/* ---------------- Card ---------------- */
export function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
      {...props}
    />
  );
}
export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex items-start justify-between gap-3 p-5 pb-0", className)} {...props} />;
}
export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-sm font-semibold text-neutral-900 dark:text-neutral-100", className)} {...props} />;
}
export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}

/* ---------------- Badge ---------------- */
const badgeTones = {
  neutral: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300",
  good: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  warn: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400",
  danger: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
};
export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.ComponentProps<"span"> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

/* ---------------- StatCard (KPI refinado: tile de ícone + fundo suave) ---------------- */
const statTones = {
  blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400",
  violet: "bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400",
  red: "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400",
  neutral: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "blue",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  tone?: keyof typeof statTones;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900",
        className,
      )}
    >
      <div className={cn("grid h-11 w-11 place-items-center rounded-xl", statTones[tone])}>{icon}</div>
      <div className="mt-4 text-[26px] font-bold leading-none tabular-nums">{value}</div>
      <div className="mt-1.5 text-xs font-medium text-neutral-500">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-neutral-400">{hint}</div>}
    </div>
  );
}
