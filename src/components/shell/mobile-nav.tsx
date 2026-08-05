"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileNavItem = { href: string; label: string; icon: LucideIcon };
export type MobileNavGroup = { title: string; items: MobileNavItem[] };

const ACCENT: Record<string, string> = {
  blue: "bg-blue-600 text-white",
  emerald: "bg-emerald-600 text-white",
  indigo: "bg-indigo-600 text-white",
};

/**
 * Drawer de navegação para telas pequenas (o menu lateral fica oculto em mobile).
 * Acessível: botão com aria-expanded/controls, diálogo modal com rótulo, fechar
 * por Esc/overlay, trava de rolagem do corpo e retenção de foco (focus trap).
 */
export function MobileNav({
  groups,
  accent = "blue",
  title = "Menu",
  home,
}: {
  groups: MobileNavGroup[];
  accent?: "blue" | "emerald" | "indigo";
  title?: string;
  home?: string;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    document.body.style.overflow = "hidden";
    // foca o primeiro elemento focável do painel
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        openerRef.current?.focus();
      } else if (e.key === "Tab") {
        const items = focusables();
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  const isActive = (href: string) =>
    home && href === home ? path === home : path === href || path.startsWith(href + "/");

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir menu de navegação"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 text-neutral-600 md:hidden dark:border-neutral-700 dark:text-neutral-300"
      >
        <Menu size={18} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={close} aria-hidden="true" />
          <div
            ref={panelRef}
            id="mobile-nav-panel"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col border-r border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <span className="text-sm font-bold">{title}</span>
              <button
                type="button"
                onClick={close}
                aria-label="Fechar menu"
                className="grid h-8 w-8 place-items-center rounded-lg border border-neutral-200 text-neutral-500 hover:text-neutral-800 dark:border-neutral-700 dark:text-neutral-300"
              >
                <X size={16} />
              </button>
            </div>
            <nav aria-label={title} className="flex-1 overflow-y-auto px-3 py-3">
              {groups.map((group) => (
                <div key={group.title}>
                  {group.title && (
                    <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                      {group.title}
                    </p>
                  )}
                  {group.items.map(({ href, label, icon: Icon }) => {
                    const active = isActive(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={close}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                          active
                            ? ACCENT[accent]
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
          </div>
        </div>
      )}
    </>
  );
}
