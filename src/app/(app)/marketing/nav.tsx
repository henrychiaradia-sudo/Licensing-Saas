"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Megaphone,
  Sparkles,
  ClipboardList,
  Building2,
  Star,
  Wallet,
  CalendarDays,
} from "lucide-react";

const TABS = [
  { href: "/marketing", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/marketing/planos", label: "Planos", icon: ClipboardList },
  { href: "/marketing/campanhas", label: "Campanhas", icon: Megaphone },
  { href: "/marketing/acoes", label: "Ações", icon: Sparkles },
  { href: "/marketing/verbas", label: "Verbas", icon: Wallet },
  { href: "/marketing/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/marketing/agencias", label: "Agências", icon: Building2 },
  { href: "/marketing/influenciadores", label: "Influenciadores", icon: Star },
];

export function MarketingNav() {
  const path = usePathname();
  return (
    <div className="mb-6 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800">
      <nav className="flex min-w-max gap-1">
        {TABS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? path === href : path === href || path.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
              )}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
