"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, FileText, Package, Coins, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const nav: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/portal", label: "Início", icon: LayoutGrid },
  { href: "/portal/contratos", label: "Meus Contratos", icon: FileText },
  { href: "/portal/produtos", label: "Produtos & Aprovações", icon: Package },
  { href: "/portal/royalties", label: "Reportes de Royalties", icon: Coins },
  { href: "/portal/financeiro", label: "Financeiro", icon: Wallet },
];

export function PortalNav() {
  const path = usePathname();
  return (
    <nav className="flex-1 px-3 pb-4 pt-3">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = href === "/portal" ? path === "/portal" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium",
              active
                ? "bg-emerald-600 text-white"
                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
