"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Bell,
  Users,
  Star,
  FileText,
  Coins,
  Landmark,
  ClipboardCheck,
  Images,
  ShieldCheck,
  ShoppingCart,
  Factory,
  Scale,
  ScrollText,
  BarChart3,
  ClipboardList,
  Microscope,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { title: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    title: "Operação",
    items: [
      { href: "/dashboard", label: "Dashboard Executivo", icon: LayoutGrid },
      { href: "/pendencias", label: "Pendências", icon: Bell },
      { href: "/licenciados", label: "Licenciados", icon: Users },
      { href: "/contratos", label: "Contratos", icon: FileText },
      { href: "/marcas", label: "Marcas & IP", icon: Star },
      { href: "/produtos", label: "Aprovação de Produtos", icon: ClipboardCheck },
      { href: "/royalties", label: "Royalties", icon: Coins },
      { href: "/financeiro", label: "Financeiro", icon: Landmark },
      { href: "/biblioteca", label: "Biblioteca Digital", icon: Images },
    ],
  },
  {
    title: "Suprimentos",
    items: [
      { href: "/fornecedores", label: "Fornecedores", icon: Factory },
      { href: "/requisicoes", label: "Requisições", icon: ClipboardList },
      { href: "/compras", label: "Pedidos de Compra", icon: ShoppingCart },
      { href: "/sourcing", label: "Sourcing & Cotações", icon: Scale },
    ],
  },
  {
    title: "Governança & BI",
    items: [
      { href: "/compliance", label: "Compliance & Riscos", icon: ShieldCheck },
      { href: "/qualidade", label: "Qualidade", icon: Microscope },
      { href: "/auditoria", label: "Auditoria", icon: ScrollText },
      { href: "/bi", label: "BI & Analytics", icon: BarChart3 },
    ],
  },
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
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              {group.title}
            </p>
            {group.items.map(({ href, label, icon: Icon }) => {
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
          </div>
        ))}
      </nav>

      <div className="border-t border-neutral-200 px-5 py-3 text-[11.5px] text-neutral-400 dark:border-neutral-800">
        NovaSport Global · Demo
        <br />
        v0.6 — Fases 1–6
      </div>
    </aside>
  );
}
