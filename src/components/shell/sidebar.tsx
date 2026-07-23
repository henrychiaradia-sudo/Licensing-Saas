"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Star,
  FileText,
  Coins,
  Landmark,
  ClipboardCheck,
  Images,
  ShieldCheck,
  ShoppingCart,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard Executivo", icon: LayoutGrid },
  { href: "/licenciados", label: "Licenciados", icon: Users },
  { href: "/marcas", label: "Marcas & IP", icon: Star },
  { href: "/produtos", label: "Aprovação de Produtos", icon: ClipboardCheck },
  { href: "/biblioteca", label: "Biblioteca Digital", icon: Images },
];

const soon: { label: string; icon: LucideIcon; tag: string }[] = [
  { label: "Contratos", icon: FileText, tag: "F3" },
  { label: "Royalties", icon: Coins, tag: "F3" },
  { label: "Financeiro", icon: Landmark, tag: "F3" },
  { label: "Compliance & Auditoria", icon: ShieldCheck, tag: "F5" },
  { label: "Procurement", icon: ShoppingCart, tag: "F6" },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2.5 px-5 py-4 text-[15px] font-bold">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 text-white">
          A
        </span>
        Aurora <span className="font-medium text-neutral-400">Licensing</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Operação
        </p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium",
                active
                  ? "bg-blue-600 text-white"
                  : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}

        <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Próximas fases
        </p>
        {soon.map(({ label, icon: Icon, tag }) => (
          <span
            key={label}
            className="mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium text-neutral-400 dark:text-neutral-600"
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[9.5px] dark:bg-neutral-800">
              {tag}
            </span>
          </span>
        ))}
      </nav>

      <div className="border-t border-neutral-200 px-5 py-3 text-[11.5px] text-neutral-400 dark:border-neutral-800">
        NovaSport Global · Demo
        <br />
        v0.1 — Fase 1 (Núcleo)
      </div>
    </aside>
  );
}
