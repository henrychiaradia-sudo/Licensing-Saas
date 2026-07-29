"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Building2,
  Plane,
  Landmark,
  DownloadCloud,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { syncLiveRatesAction, type FormState } from "./actions";
import type { LiveQuotes, LiveQuote } from "@/lib/fx-live";

type View = "comercial" | "turismo" | "ptax";

const VIEWS: { key: View; label: string; icon: React.ReactNode }[] = [
  { key: "comercial", label: "Comercial", icon: <Building2 size={14} /> },
  { key: "turismo", label: "Turismo", icon: <Plane size={14} /> },
  { key: "ptax", label: "PTAX (oficial)", icon: <Landmark size={14} /> },
];

function fmtR(n: number) {
  return "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

function QuoteCard({ q }: { q: LiveQuote }) {
  const up = q.pctChange >= 0;
  const flat = q.pctChange === 0;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3.5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            {q.code}
          </span>
          <span className="text-[12px] font-medium text-neutral-500">{q.pairLabel}</span>
        </div>
        {flat ? (
          <span className="rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-neutral-400 dark:bg-neutral-800">—</span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums",
              up ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" : "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
            )}
          >
            {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {up ? "+" : ""}
            {q.pctChange.toFixed(2).replace(".", ",")}%
          </span>
        )}
      </div>
      <div className="mt-2.5 flex items-end justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-neutral-400">Venda</div>
          <div className="text-[19px] font-bold leading-none text-neutral-900 tabular-nums dark:text-white">{fmtR(q.ask)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wide text-neutral-400">Compra</div>
          <div className="text-[13px] font-semibold text-neutral-600 tabular-nums dark:text-neutral-300">{fmtR(q.bid)}</div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between border-t border-neutral-100 pt-2 text-[11px] text-neutral-400 dark:border-neutral-800">
        <span>mín {fmtR(q.low)}</span>
        <span>máx {fmtR(q.high)}</span>
      </div>
    </div>
  );
}

export function FxLivePanel() {
  const [data, setData] = useState<LiveQuotes | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  const [view, setView] = useState<View>("comercial");
  const [syncState, syncAction, syncing] = useActionState<FormState, FormData>(syncLiveRatesAction, { error: null });

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/fx", { cache: "no-store" });
      const j = (await res.json()) as LiveQuotes;
      setData(j);
      setLastFetch(new Date().toLocaleTimeString("pt-BR"));
    } catch {
      /* mantém os dados anteriores */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, [load]);

  const quotes = data ? data[view] : [];

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <span className="block h-[3px] bg-gradient-to-r from-blue-600 via-cyan-500 to-transparent" />
      <div className="p-5">
        {/* Cabeçalho */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
              <span className="relative flex h-2 w-2">
                <span className={cn("absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70", !loading && "animate-ping")} />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Cotação em tempo real
            </h2>
            <p className="mt-0.5 text-[11.5px] text-neutral-500">
              Fonte: {data?.source ?? "—"} · atualiza a cada 60s
              {data?.updatedAt ? ` · ${data.updatedAt}` : ""}
              {lastFetch ? ` · lido ${lastFetch}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => load()} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Atualizar
            </Button>
            <form action={syncAction}>
              <Button type="submit" size="sm" disabled={syncing}>
                {syncing ? <Loader2 size={14} className="animate-spin" /> : <DownloadCloud size={14} />} Sincronizar
              </Button>
            </form>
          </div>
        </div>

        {syncState.message && <p className="mb-3 text-[12px] text-emerald-600">{syncState.message}</p>}
        {syncState.error && <p className="mb-3 text-[12px] text-red-600">{syncState.error}</p>}
        {data?.note && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{data.note}</span>
          </div>
        )}

        {/* Seletor */}
        <div className="mb-4 inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-800 dark:bg-neutral-800/40">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                view === v.key
                  ? "bg-white text-blue-700 shadow-sm dark:bg-neutral-900 dark:text-blue-300"
                  : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300",
              )}
            >
              {v.icon}
              {v.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        {loading && !data ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-400">
            <Loader2 size={16} className="animate-spin" /> Carregando cotações…
          </div>
        ) : data && !data.ok ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-500">
            <AlertCircle size={16} className="text-amber-500" /> Não foi possível obter as cotações agora. Tente novamente.
          </div>
        ) : quotes.length === 0 ? (
          <p className="py-10 text-center text-sm text-neutral-400">
            {view === "comercial"
              ? "Sem cotações no momento."
              : "Disponível ao cadastrar a chave gratuita da AwesomeAPI (veja o aviso acima)."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {quotes.map((q) => (
              <QuoteCard key={q.pairLabel} q={q} />
            ))}
          </div>
        )}

        {view === "turismo" && quotes.length > 0 && (
          <p className="mt-3 text-[11px] text-neutral-400">
            Turismo: taxa praticada para compra de moeda em espécie/viagem (inclui spread). Comercial é a referência de mercado.
          </p>
        )}
        {view === "ptax" && quotes.length > 0 && (
          <p className="mt-3 text-[11px] text-neutral-400">PTAX: taxa oficial de referência do Banco Central do Brasil.</p>
        )}
      </div>
    </div>
  );
}
