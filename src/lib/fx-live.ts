import "server-only";

/* ============================================================================
 * Cotação cambial em tempo real — fonte: AwesomeAPI (economia.awesomeapi.com.br)
 * Gratuita, brasileira; fornece comercial, turismo (BRLT) e PTAX oficial (BCB).
 * Um token opcional (env AWESOMEAPI_TOKEN) remove o cache de 1 min e eleva limites.
 * ==========================================================================*/

export type LiveQuote = {
  code: string; // moeda base do par (ex.: USD)
  pairLabel: string; // ex.: USD/BRL
  name: string;
  bid: number; // compra
  ask: number; // venda
  high: number;
  low: number;
  pctChange: number; // variação % no dia
  varBid: number; // variação absoluta
  updatedAt: string; // create_date (UTC-3)
};

export type LiveQuotes = {
  ok: boolean;
  error?: string;
  updatedAt: string | null;
  comercial: LiveQuote[];
  turismo: LiveQuote[];
  ptax: LiveQuote[];
};

/** Moedas tradicionais (comercial). */
export const COMERCIAL_PAIRS = [
  "USD-BRL",
  "EUR-BRL",
  "GBP-BRL",
  "JPY-BRL",
  "CHF-BRL",
  "CAD-BRL",
  "AUD-BRL",
  "CNY-BRL",
  "ARS-BRL",
];
/** Dólar/Euro turismo. */
export const TURISMO_PAIRS = ["USD-BRLT", "EUR-BRLT"];
/** PTAX oficial (Banco Central). */
export const PTAX_PAIRS = ["USD-BRLPTAX", "EUR-BRLPTAX"];

type Raw = {
  code: string;
  codein: string;
  name: string;
  high: string;
  low: string;
  varBid: string;
  pctChange: string;
  bid: string;
  ask: string;
  timestamp: string;
  create_date: string;
};

function toQuote(r: Raw, pair: string): LiveQuote {
  const base = pair.split("-")[0];
  const nm = r.name?.split("/")[0]?.trim() || base;
  return {
    code: base,
    pairLabel: `${base}/BRL`,
    name: nm,
    bid: Number(r.bid),
    ask: Number(r.ask),
    high: Number(r.high),
    low: Number(r.low),
    pctChange: Number(r.pctChange),
    varBid: Number(r.varBid),
    updatedAt: r.create_date,
  };
}

function empty(error: string): LiveQuotes {
  return { ok: false, error, updatedAt: null, comercial: [], turismo: [], ptax: [] };
}

export async function fetchLiveQuotes(): Promise<LiveQuotes> {
  const token = process.env.AWESOMEAPI_TOKEN;
  const pairs = [...COMERCIAL_PAIRS, ...TURISMO_PAIRS, ...PTAX_PAIRS];
  const url =
    `https://economia.awesomeapi.com.br/json/last/${pairs.join(",")}` + (token ? `?token=${token}` : "");
  try {
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return empty(`HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, Raw>;
    const pick = (list: string[]) =>
      list
        .map((p) => {
          const r = data[p.replace("-", "")];
          return r ? toQuote(r, p) : null;
        })
        .filter((q): q is LiveQuote => q !== null);
    const comercial = pick(COMERCIAL_PAIRS);
    const turismo = pick(TURISMO_PAIRS);
    const ptax = pick(PTAX_PAIRS);
    if (!comercial.length && !turismo.length && !ptax.length) return empty("Sem dados retornados.");
    return { ok: true, updatedAt: comercial[0]?.updatedAt ?? null, comercial, turismo, ptax };
  } catch (e) {
    return empty(e instanceof Error ? e.message : "Falha ao consultar a fonte de cotação.");
  }
}
