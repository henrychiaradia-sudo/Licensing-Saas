"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Sparkles,
  FileText,
  Star,
  Package,
  Coins,
  Wallet,
  Landmark,
  Megaphone,
  Bell,
  Lock,
  UserCheck,
  FileSignature,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { title: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    title: "Operação",
    items: [
      { href: "/portal", label: "Painel", icon: LayoutGrid },
      { href: "/portal/ia", label: "Assistente IA", icon: Sparkles },
      { href: "/portal/contratos", label: "Meus Contratos", icon: FileText },
      { href: "/portal/marcas", label: "Minhas Marcas", icon: Star },
      { href: "/portal/produtos", label: "Produtos & Aprovações", icon: Package },
      { href: "/portal/royalties", label: "Reportes de Royalties", icon: Coins },
      { href: "/portal/documentos", label: "Documentos", icon: FileSignature },
    ],
  },
  {
    title: "Financeiro & Controladoria",
    items: [
      { href: "/portal/financeiro", label: "Financeiro", icon: Wallet },
      { href: "/portal/controladoria", label: "Controladoria", icon: Landmark },
    ],
  },
  {
    title: "Comercial",
    items: [{ href: "/portal/marketing", label: "Marketing", icon: Megaphone }],
  },
  {
    title: "Conta",
    items: [
      { href: "/portal/notificacoes", label: "Notificações", icon: Bell },
      { href: "/portal/seguranca", label: "Segurança", icon: Lock },
      { href: "/portal/meus-dados", label: "Meus Dados (LGPD)", icon: UserCheck },
    ],
  },
];

export function PortalNav() {
  const path = usePathname();
  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            {group.title}
          </p>
          {group.items.map(({ href, label, icon: Icon }) => {
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
        </div>
      ))}
    </nav>
  );
}
