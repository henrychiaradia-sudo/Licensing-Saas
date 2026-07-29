"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie } from "lucide-react";

const KEY = "alz_cookie_notice_v1";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl rounded-2xl border border-neutral-200 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50">
          <Cookie size={18} />
        </span>
        <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-neutral-600 dark:text-neutral-300">
          Usamos apenas <strong>cookies estritamente necessários</strong> para manter você autenticado — sem
          rastreamento ou publicidade. Saiba mais na{" "}
          <Link href="/privacidade" className="font-medium text-blue-600">Política de Privacidade</Link>.
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
