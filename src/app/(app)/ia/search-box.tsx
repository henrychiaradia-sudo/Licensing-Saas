"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft } from "lucide-react";
import { Button, Input } from "@/components/ui";

export function SearchBox({ initial = "", examples }: { initial?: string; examples: string[] }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  function go(query: string) {
    const term = query.trim();
    if (!term) return;
    router.push(`/ia?q=${encodeURIComponent(term)}`);
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(q);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pergunte sobre seus dados… ex.: contratos vencendo, exposição em dólar"
            className="h-11 pl-9"
          />
        </div>
        <Button type="submit" className="h-11 px-4">
          <CornerDownLeft size={15} /> Perguntar
        </Button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {examples.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => {
              setQ(ex);
              go(ex);
            }}
            className="rounded-full border border-neutral-200 px-2.5 py-1 text-[11px] text-neutral-500 hover:border-blue-400 hover:text-blue-600 dark:border-neutral-700"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
