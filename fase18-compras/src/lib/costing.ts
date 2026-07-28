/**
 * Motor de formação de custo/preço (cost breakdown) — funções puras e testáveis.
 * Convenção: valores por unidade, na moeda da ficha.
 *
 * CIF            = FOB + Frete internacional + Seguro
 * Impostos       = II + IPI imp. + ICMS + PIS + COFINS + ISS + IPI
 * Custos import. = Armazenagem + Desembaraço
 * Outros custos  = Comissão + Royalties + Marketing + Trade + Logística
 * Custo total    = CIF + Impostos + Custos import. + Outros custos + Custo industrial
 * Preço sugerido = Custo total × (1 + markup%)
 * Margem %       = (Preço − Custo total) / Preço × 100
 */

export type CostInput = {
  fob: number;
  freightIntl: number;
  insurance: number;
  ii: number;
  ipiImport: number;
  icms: number;
  pis: number;
  cofins: number;
  iss: number;
  ipi: number;
  armazenagem: number;
  desembaraco: number;
  comissao: number;
  royalties: number;
  marketing: number;
  trade: number;
  logistica: number;
  custoIndustrial: number;
  markupPct: number;
};

export type CostResult = {
  cif: number;
  impostos: number;
  custosImportacao: number;
  outrosCustos: number;
  custoTotal: number;
  precoSugerido: number;
  margemPct: number;
  markupPct: number;
};

const n = (v: unknown) => {
  const x = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(x) ? x : 0;
};

export function computeCost(input: Partial<CostInput>): CostResult {
  const i = {
    fob: n(input.fob),
    freightIntl: n(input.freightIntl),
    insurance: n(input.insurance),
    ii: n(input.ii),
    ipiImport: n(input.ipiImport),
    icms: n(input.icms),
    pis: n(input.pis),
    cofins: n(input.cofins),
    iss: n(input.iss),
    ipi: n(input.ipi),
    armazenagem: n(input.armazenagem),
    desembaraco: n(input.desembaraco),
    comissao: n(input.comissao),
    royalties: n(input.royalties),
    marketing: n(input.marketing),
    trade: n(input.trade),
    logistica: n(input.logistica),
    custoIndustrial: n(input.custoIndustrial),
    markupPct: n(input.markupPct),
  };
  const cif = i.fob + i.freightIntl + i.insurance;
  const impostos = i.ii + i.ipiImport + i.icms + i.pis + i.cofins + i.iss + i.ipi;
  const custosImportacao = i.armazenagem + i.desembaraco;
  const outrosCustos = i.comissao + i.royalties + i.marketing + i.trade + i.logistica;
  const custoTotal = cif + impostos + custosImportacao + outrosCustos + i.custoIndustrial;
  const precoSugerido = custoTotal * (1 + i.markupPct / 100);
  const margemPct = precoSugerido > 0 ? ((precoSugerido - custoTotal) / precoSugerido) * 100 : 0;
  return {
    cif,
    impostos,
    custosImportacao,
    outrosCustos,
    custoTotal,
    precoSugerido,
    margemPct,
    markupPct: i.markupPct,
  };
}

/** Campos do cost breakdown agrupados (para formulário e exibição). */
export const COST_GROUPS: {
  group: string;
  fields: { key: keyof CostInput; label: string; hint?: string }[];
}[] = [
  {
    group: "Origem",
    fields: [
      { key: "fob", label: "Preço FOB" },
      { key: "freightIntl", label: "Frete internacional" },
      { key: "insurance", label: "Seguro" },
    ],
  },
  {
    group: "Impostos",
    fields: [
      { key: "ii", label: "II (Imposto de Importação)" },
      { key: "ipiImport", label: "IPI Importação" },
      { key: "icms", label: "ICMS" },
      { key: "pis", label: "PIS" },
      { key: "cofins", label: "COFINS" },
      { key: "iss", label: "ISS" },
      { key: "ipi", label: "IPI" },
    ],
  },
  {
    group: "Custos de importação",
    fields: [
      { key: "armazenagem", label: "Armazenagem" },
      { key: "desembaraco", label: "Desembaraço" },
    ],
  },
  {
    group: "Outros custos",
    fields: [
      { key: "comissao", label: "Comissão" },
      { key: "royalties", label: "Royalties" },
      { key: "marketing", label: "Marketing" },
      { key: "trade", label: "Trade" },
      { key: "logistica", label: "Logística (frete nacional)" },
      { key: "custoIndustrial", label: "Custo industrial" },
    ],
  },
];

export const COST_FIELD_KEYS: (keyof CostInput)[] = [
  ...COST_GROUPS.flatMap((g) => g.fields.map((f) => f.key)),
  "markupPct",
];
