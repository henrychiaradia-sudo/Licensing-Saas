"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Eye } from "lucide-react";

type Opt = { id: string; label: string };

const selectCls =
  "h-8 rounded-lg border border-neutral-200 bg-white px-2 text-[12.5px] outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900";

/** Seletor global de Visão: Consolidada × por Marca / Licenciado / Fornecedor. */
export function ViewSelector({
  brands,
  licensees,
  suppliers,
}: {
  brands: Opt[];
  licensees: Opt[];
  suppliers: Opt[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [rawDim, rawId] = (searchParams.get("view") ?? "").split(":");
  const [dim, setDim] = useState<string>(rawDim || "");
  const [id, setId] = useState<string>(rawId || "");

  const opts = dim === "marca" ? brands : dim === "licenciado" ? licensees : dim === "fornecedor" ? suppliers : [];

  function push(nextDim: string, nextId: string) {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    if (nextDim && nextId) params.set("view", `${nextDim}:${nextId}`);
    else params.delete("view");
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onDim(v: string) {
    setDim(v);
    setId("");
    if (!v) push("", ""); // volta para Consolidada
  }
  function onId(v: string) {
    setId(v);
    push(dim, v);
  }

  return (
    <div
      className="hidden items-center gap-1.5 rounded-lg border border-neutral-200 bg-white/70 px-2 py-1 lg:flex dark:border-neutral-700 dark:bg-neutral-900/70"
      title="Visão dos dados"
    >
      <Eye size={14} className="text-neutral-400" />
      <select value={dim} onChange={(e) => onDim(e.target.value)} className={selectCls} aria-label="Dimensão da visão">
        <option value="">Consolidada</option>
        <option value="marca">Por Marca</option>
        <option value="licenciado">Por Licenciado</option>
        <option value="fornecedor">Por Fornecedor</option>
      </select>
      {dim && (
        <select value={id} onChange={(e) => onId(e.target.value)} className={`${selectCls} max-w-[180px]`} aria-label="Item da visão">
          <option value="">Selecione…</option>
          {opts.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
