"use client";

import { useRouter } from "next/navigation";
import { LOCALES, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Seletor de idioma PT | EN. Grava um cookie e atualiza os Server Components. */
export function LanguageSwitcher({
  locale,
  className,
}: {
  locale: Locale;
  className?: string;
}) {
  const router = useRouter();

  function choose(l: Locale) {
    if (l === locale) return;
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <div
      role="group"
      aria-label="Idioma / Language"
      className={cn(
        "inline-flex items-center rounded-lg border border-neutral-200 p-0.5 text-[11px] font-semibold dark:border-neutral-700",
        className,
      )}
    >
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => choose(l)}
            aria-pressed={active}
            className={cn(
              "rounded-md px-2 py-1 transition-colors",
              active
                ? "bg-blue-600 text-white"
                : "text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100",
            )}
          >
            {l === "pt-BR" ? "PT" : "EN"}
          </button>
        );
      })}
    </div>
  );
}
