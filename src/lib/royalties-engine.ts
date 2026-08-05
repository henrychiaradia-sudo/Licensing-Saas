/**
 * Motor de cálculo de royalties — funções puras (sem acesso a banco).
 *
 * Suporta os tipos do schema (`royalty_type`): percentual, fixo, hibrido e
 * escalonado (faixas progressivas). Aplica piso (minRoyalty) e teto (maxRoyalty).
 *
 * Convenção de alíquota: valores > 1 são tratados como percentual (ex.: 10 = 10%),
 * valores <= 1 como fração (ex.: 0.1 = 10%) — igual ao resto do app.
 */

export type RoyaltyType = "percentual" | "fixo" | "hibrido" | "escalonado";

export type RoyaltyRuleInput = {
  royaltyType: RoyaltyType;
  percentage?: number | string | null;
  fixedAmount?: number | string | null;
  minRoyalty?: number | string | null;
  maxRoyalty?: number | string | null;
};

export type TierInput = {
  tierFrom: number | string;
  tierTo?: number | string | null;
  rate: number | string;
};

export type TierBreakdown = {
  from: number;
  to: number | null;
  ratePct: number; // alíquota da faixa, em % (ex.: 8)
  portion: number; // base que caiu nesta faixa
  amount: number; // royalty gerado por esta faixa
};

export type RoyaltyComputation = {
  base: number;
  royaltyBeforeBounds: number;
  royalty: number; // após piso/teto
  effectiveRate: number; // royalty / base (fração); 0 se base = 0
  minApplied: boolean;
  maxApplied: boolean;
  isTiered: boolean;
  breakdown: TierBreakdown[];
};

function num(x: number | string | null | undefined): number {
  if (x == null) return 0;
  const v = typeof x === "number" ? x : Number(x);
  return Number.isFinite(v) ? v : 0;
}

/** Converte alíquota (percentual ou fração) para fração. */
export function toFraction(pct: number | string | null | undefined): number {
  const v = num(pct);
  return v > 1 ? v / 100 : v;
}

/** Calcula o royalty de uma base (ex.: vendas líquidas totais) para uma regra. */
export function computeRoyalty(
  base: number | string,
  rule: RoyaltyRuleInput | null | undefined,
  tiers: TierInput[] = [],
): RoyaltyComputation {
  const b = Math.max(0, num(base));
  const breakdown: TierBreakdown[] = [];
  const isTiered = rule?.royaltyType === "escalonado" && tiers.length > 0;
  let gross = 0;

  if (isTiered) {
    const sorted = [...tiers].sort((a, c) => num(a.tierFrom) - num(c.tierFrom));
    for (const t of sorted) {
      const from = Math.max(0, num(t.tierFrom));
      const hasTo = t.tierTo != null && t.tierTo !== "";
      const to = hasTo ? num(t.tierTo) : Infinity;
      if (b <= from) continue;
      const portion = Math.min(b, to) - from;
      if (portion <= 0) continue;
      const amount = portion * toFraction(t.rate);
      gross += amount;
      breakdown.push({ from, to: hasTo ? to : null, ratePct: num(t.rate), portion, amount });
    }
  } else if (rule?.royaltyType === "fixo") {
    gross = num(rule.fixedAmount);
  } else {
    // percentual (e fallback padrão)
    const r = toFraction(rule?.percentage);
    gross = b * r;
    if (b > 0) breakdown.push({ from: 0, to: null, ratePct: num(rule?.percentage), portion: b, amount: gross });
  }

  // híbrido: percentual + valor fixo
  if (rule?.royaltyType === "hibrido") {
    gross = b * toFraction(rule.percentage) + num(rule.fixedAmount);
  }

  let min = rule?.minRoyalty != null && rule.minRoyalty !== "" ? num(rule.minRoyalty) : null;
  const max = rule?.maxRoyalty != null && rule.maxRoyalty !== "" ? num(rule.maxRoyalty) : null;
  // Guarda defensiva: configuração inválida (piso > teto) ignora o piso para
  // respeitar o teto — o cadastro já bloqueia esse caso (constraint + validação).
  if (min != null && max != null && min > max) min = null;
  let royalty = gross;
  let minApplied = false;
  let maxApplied = false;
  if (min != null && royalty < min) {
    royalty = min;
    minApplied = true;
  }
  if (max != null && royalty > max) {
    royalty = max;
    maxApplied = true;
  }

  return {
    base: b,
    royaltyBeforeBounds: gross,
    royalty,
    effectiveRate: b > 0 ? royalty / b : 0,
    minApplied,
    maxApplied,
    isTiered,
    breakdown,
  };
}
