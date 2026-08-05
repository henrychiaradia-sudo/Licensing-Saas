"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, ShoppingCart, Truck, Microscope, Gauge, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { MobileNav } from "@/components/shell/mobile-nav";

const nav: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/fornecedor", label: "Início", icon: LayoutGrid },
  { href: "/fornecedor/pedidos", label: "Meus Pedidos", icon: ShoppingCart },
  { href: "/fornecedor/embarques", label: "Embarques", icon: Truck },
  { href: "/fornecedor/qualidade", label: "Qualidade", icon: Microscope },
  { href: "/fornecedor/desempenho", label: "Desempenho", icon: Gauge },
];

export function SupplierNav() {
  const path = usePathname();
  return (
    <nav aria-label="Navegação do fornecedor" className="flex-1 px-3 pb-4 pt-3">
      {nav.map(({ href, label, icon: Icon }) => {
        const active = href === "/fornecedor" ? path === "/fornecedor" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium",
              active
                ? "bg-indigo-600 text-white"
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

/** Botão + drawer de navegação do portal do fornecedor para telas pequenas. */
export function SupplierNavMobile() {
  return (
    <MobileNav
      groups={[{ title: "", items: nav }]}
      accent="indigo"
      title="Portal Fornecedor"
      home="/fornecedor"
    />
  );
}
