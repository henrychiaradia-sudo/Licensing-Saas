import "server-only";

/* ============================================================================
 * Cotação cambial em tempo real.
 * Fonte primária: AwesomeAPI (comercial + turismo + PTAX oficial). Gratuita,
 *   brasileira; sem chave sofre limite de requisições (HTTP 429) a partir de
 *   IPs de datacenter. Uma chave gratuita (env AWESOMEAPI_TOKEN) remove o
 *   limite e ativa turismo/PTAX de forma estável.
 * Fallback (sem chave): open.er-api.com — taxas de mercado (comercial),
 *   sem chave e sem bloqueio, para o painel funcionar de imediato.
 * ==========================================================================*/

export type LiveQuote = {
  code: string; // moeda base do par (ex.: USD)
  pairLabel: string; // ex.: USD/BRL
  name: string;
  bid: number; // compra
  ask: number; // venda
  high: number;
  low: number;
  pctChange: number; // variação % no dia (0 quando a fonte não informa)
  varBid: number;
  updatedAt: string;
};

export type LiveQuotes = {
  ok: boolean;
  error?: string;
  source: string; // rótulo da fonte ativa
  note?: string; // aviso (ex.: turismo/PTAX requerem chave)
  updatedAt: string | null;
  comercial: LiveQuote[];
  turismo: LiveQuote[];
  ptax: LiveQuote[];
};

export const COMERCIAL_PAIRS = ["USD-BRL", "EUR-BRL", "GBP-BRL", "JPY-BRL", "CHF-BRL", "CAD-BRL", "AUD-BRL", "CNY-BRL", "ARS-BRL"];
export const TURISMO_PAIRS = ["USD-BRLT", "EUR-BRLT"];
export const PTAX_PAIRS = ["USD-BRLPTAX", "EUR-BRLPTAX"];

const FALLBACK_CODES = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "CNY", "ARS"];
const CUR_NAME: Record<string, string> = {
  USD: "Dólar Americano",
  EUR: "Euro",
  GBP: "Libra Esterlina",
  JPY: "Iene Japonês",
  CHF: "Franco Suíço",
  CAD: "Dólar Canadense",
  AUD: "Dólar Australiano",
  CNY: "Yuan Chinês",
  ARS: "Peso Argentino",
};

type Raw = {
  name: string;
  high: string;
  low: string;
  varBid: string;
  pctChange: string;
  bid: string;
  ask: string;
  create_date: string;
};

function toQuote(r: Raw, pair: string): LiveQuote {
  const base = pair.split("-")[0];
  return {
    code: base,
    pairLabel: `${base}/BRL`,
    name: r.name?.split("/")[0]?.trim() || base,
    bid: Number(r.bid),
    ask: Number(r.ask),
    high: Number(r.high),
    low: Number(r.low),
    pctChange: Number(r.pctChange),
    varBid: Number(r.varBid),
    updatedAt: r.create_date,
  };
}

async function fetchAwesome(
  token: string | undefined,
): Promise<{ comercial: LiveQuote[]; turismo: LiveQuote[]; ptax: LiveQuote[]; updatedAt: string | null } | null> {
  const pairs = [...COMERCIAL_PAIRS, ...TURISMO_PAIRS, ...PTAX_PAIRS];
  const url = `https://economia.awesomeapi.com.br/json/last/${pairs.join(",")}` + (token ? `?token=${token}` : "");
  try {
    const res = await fetch(url, {
      next: { revalidate: 60 },
      headers: { "User-Agent": "ALIANZA-Licensing/1.0", Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, Raw>;
    const pick = (list: string[]) =>
      list.map((p) => (data[p.replace("-", "")] ? toQuote(data[p.replace("-", "")], p) : null)).filter((q): q is LiveQuote => q !== null);
    const comercial = pick(COMERCIAL_PAIRS);
    if (!comercial.length) return null;
    return { comercial, turismo: pick(TURISMO_PAIRS), ptax: pick(PTAX_PAIRS), updatedAt: comercial[0]?.updatedAt ?? null };
  } catch {
    return null;
  }
}

async function fetchFallbackComercial(): Promise<{ comercial: LiveQuote[]; updatedAt: string | null } | null> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/BRL", { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const j = (await res.json()) as { result?: string; time_last_update_utc?: string; rates?: Record<string, number> };
    if (j.result !== "success" || !j.rates) return null;
    const updatedAt = j.time_last_update_utc ?? null;
    const comercial = FALLBACK_CODES.map((code) => {
      const perBrl = j.rates?.[code];
      if (!perBrl || perBrl <= 0) return null;
      const brlPerUnit = 1 / perBrl; // BRL por 1 unidade
      return {
        code,
        pairLabel: `${code}/BRL`,
        name: CUR_NAME[code] ?? code,
        bid: brlPerUnit,
        ask: brlPerUnit,
        high: brlPerUnit,
        low: brlPerUnit,
        pctChange: 0,
        varBid: 0,
        updatedAt: updatedAt ?? "",
      } as LiveQuote;
    }).filter((q): q is LiveQuote => q !== null);
    return comercial.length ? { comercial, updatedAt } : null;
  } catch {
    return null;
  }
}

export async function fetchLiveQuotes(): Promise<LiveQuotes> {
  const token = process.env.AWESOMEAPI_TOKEN;
  const aw = await fetchAwesome(token);
  if (aw) {
    return {
      ok: true,
      source: "AwesomeAPI",
      updatedAt: aw.updatedAt,
      comercial: aw.comercial,
      turismo: aw.turismo,
      ptax: aw.ptax,
      note: aw.turismo.length === 0 ? "Turismo/PTAX indisponíveis no momento pela fonte." : undefined,
    };
  }

  const fb = await fetchFallbackComercial();
  if (fb) {
    return {
      ok: true,
      source: "open exchange rates (mercado)",
      updatedAt: fb.updatedAt,
      comercial: fb.comercial,
      turismo: [],
      ptax: [],
      note:
        "Comercial via fonte de mercado (sem chave). Para dólar/euro TURISMO e PTAX oficial em tempo real, cadastre uma chave gratuita da AwesomeAPI na variável AWESOMEAPI_TOKEN (Vercel).",
    };
  }

  return {
    ok: false,
    source: "—",
    error: "Fontes de cotação indisponíveis no momento.",
    updatedAt: null,
    comercial: [],
    turismo: [],
    ptax: [],
  };
}
