"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Alternar tema claro/escuro"
      aria-pressed={dark}
      className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 text-neutral-600 hover:border-blue-500 hover:text-blue-600 dark:border-neutral-700 dark:text-neutral-300"
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
