"use client";

import { useEffect } from "react";

/** Rola suavemente até a primeira linha destacada (id="hl-first") ao abrir a página. */
export function HighlightScroll({ targetId = "hl-first" }: { targetId?: string }) {
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (el) {
      const t = setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
      return () => clearTimeout(t);
    }
  }, [targetId]);
  return null;
}
