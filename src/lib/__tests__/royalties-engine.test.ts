import { describe, it, expect } from "vitest";
import { computeRoyalty, toFraction } from "@/lib/royalties-engine";

describe("toFraction", () => {
  it("trata valores > 1 como percentual", () => {
    expect(toFraction(10)).toBeCloseTo(0.1);
    expect(toFraction(12.5)).toBeCloseTo(0.125);
    expect(toFraction(100)).toBeCloseTo(1);
  });
  it("trata valores <= 1 como fração", () => {
    expect(toFraction(0.1)).toBeCloseTo(0.1);
    expect(toFraction(1)).toBeCloseTo(1);
  });
  it("aceita string e nulo", () => {
    expect(toFraction("8")).toBeCloseTo(0.08);
    expect(toFraction(null)).toBe(0);
    expect(toFraction(undefined)).toBe(0);
  });
});

describe("computeRoyalty — percentual", () => {
  it("aplica alíquota percentual (>1)", () => {
    const r = computeRoyalty(100000, { royaltyType: "percentual", percentage: 10 });
    expect(r.royalty).toBeCloseTo(10000);
    expect(r.effectiveRate).toBeCloseTo(0.1);
    expect(r.isTiered).toBe(false);
  });
  it("aceita alíquota como fração (<=1) com mesmo resultado", () => {
    const r = computeRoyalty(100000, { royaltyType: "percentual", percentage: 0.1 });
    expect(r.royalty).toBeCloseTo(10000);
  });
  it("base zero gera royalty e taxa efetiva zero", () => {
    const r = computeRoyalty(0, { royaltyType: "percentual", percentage: 10 });
    expect(r.royalty).toBe(0);
    expect(r.effectiveRate).toBe(0);
  });
  it("base negativa é tratada como zero", () => {
    const r = computeRoyalty(-500, { royaltyType: "percentual", percentage: 10 });
    expect(r.base).toBe(0);
    expect(r.royalty).toBe(0);
  });
});

describe("computeRoyalty — fixo e híbrido", () => {
  it("fixo ignora a base", () => {
    const r = computeRoyalty(999999, { royaltyType: "fixo", fixedAmount: 5000 });
    expect(r.royalty).toBeCloseTo(5000);
  });
  it("híbrido soma percentual + fixo", () => {
    const r = computeRoyalty(100000, { royaltyType: "hibrido", percentage: 5, fixedAmount: 1000 });
    expect(r.royalty).toBeCloseTo(6000); // 5% de 100k = 5000 + 1000
  });
});

describe("computeRoyalty — escalonado (faixas)", () => {
  const tiers = [
    { tierFrom: 0, tierTo: 100000, rate: 8 },
    { tierFrom: 100000, tierTo: 200000, rate: 10 },
    { tierFrom: 200000, tierTo: null, rate: 12 },
  ];
  it("soma as faixas progressivas corretamente", () => {
    const r = computeRoyalty(250000, { royaltyType: "escalonado" }, tiers);
    // 100k*8% + 100k*10% + 50k*12% = 8000 + 10000 + 6000
    expect(r.royalty).toBeCloseTo(24000);
    expect(r.isTiered).toBe(true);
    expect(r.breakdown).toHaveLength(3);
  });
  it("base dentro da primeira faixa usa só a primeira alíquota", () => {
    const r = computeRoyalty(50000, { royaltyType: "escalonado" }, tiers);
    expect(r.royalty).toBeCloseTo(4000); // 50k * 8%
    expect(r.breakdown).toHaveLength(1);
  });
  it("faixa aberta no topo (tierTo null) cobre o excedente", () => {
    const r = computeRoyalty(500000, { royaltyType: "escalonado" }, tiers);
    // 8000 + 10000 + 300k*12% = 8000 + 10000 + 36000
    expect(r.royalty).toBeCloseTo(54000);
  });
});

describe("computeRoyalty — piso e teto", () => {
  it("aplica o piso quando o calculado fica abaixo", () => {
    const r = computeRoyalty(1000, { royaltyType: "percentual", percentage: 10, minRoyalty: 500 });
    expect(r.royalty).toBeCloseTo(500);
    expect(r.minApplied).toBe(true);
    expect(r.maxApplied).toBe(false);
  });
  it("aplica o teto quando o calculado ultrapassa", () => {
    const r = computeRoyalty(100000, { royaltyType: "percentual", percentage: 10, maxRoyalty: 5000 });
    expect(r.royalty).toBeCloseTo(5000);
    expect(r.maxApplied).toBe(true);
    expect(r.minApplied).toBe(false);
  });
  it("mantém royaltyBeforeBounds separado do royalty final", () => {
    const r = computeRoyalty(100000, { royaltyType: "percentual", percentage: 10, maxRoyalty: 5000 });
    expect(r.royaltyBeforeBounds).toBeCloseTo(10000);
    expect(r.royalty).toBeCloseTo(5000);
  });
});

describe("toFraction — casos-limite", () => {
  it("descontinuidade no 1: exatamente 1 é fração (100%); 1.5 é percentual (1,5%)", () => {
    expect(toFraction(1)).toBeCloseTo(1);
    expect(toFraction(1.5)).toBeCloseTo(0.015);
  });
  it("string vazia e não-numérica viram 0", () => {
    expect(toFraction("")).toBe(0);
    expect(toFraction("abc")).toBe(0);
  });
});

describe("computeRoyalty — escalonado: casos-limite", () => {
  const tiers = [
    { tierFrom: 0, tierTo: 100000, rate: 8 },
    { tierFrom: 100000, tierTo: 200000, rate: 10 },
    { tierFrom: 200000, tierTo: null, rate: 12 },
  ];
  it("exatamente no limite de uma faixa não gera excedente da próxima", () => {
    const r = computeRoyalty(100000, { royaltyType: "escalonado" }, tiers);
    expect(r.royalty).toBeCloseTo(8000);
    expect(r.breakdown).toHaveLength(1);
  });
  it("tipo escalonado sem faixas cai no comportamento percentual", () => {
    const r = computeRoyalty(100000, { royaltyType: "escalonado", percentage: 5 }, []);
    expect(r.isTiered).toBe(false);
    expect(r.royalty).toBeCloseTo(5000);
  });
  it("ordena faixas fora de ordem antes de somar", () => {
    const embaralhado = [tiers[2], tiers[0], tiers[1]];
    const r = computeRoyalty(250000, { royaltyType: "escalonado" }, embaralhado);
    expect(r.royalty).toBeCloseTo(24000);
  });
});

describe("computeRoyalty — híbrido, string e config inválida", () => {
  it("híbrido aceita fração e string no fixo", () => {
    const r = computeRoyalty("100000", { royaltyType: "hibrido", percentage: 0.05, fixedAmount: "1000" });
    expect(r.royalty).toBeCloseTo(6000);
  });
  it("base como string numérica é aceita", () => {
    const r = computeRoyalty("100000", { royaltyType: "percentual", percentage: 10 });
    expect(r.royalty).toBeCloseTo(10000);
  });
  it("CORRIGIDO (#5): piso > teto (config inválida) ignora o piso e respeita o teto", () => {
    // gross = 10% de 1000 = 100; piso 5000 > teto 200 (inválido) → piso ignorado.
    const r = computeRoyalty(1000, {
      royaltyType: "percentual",
      percentage: 10,
      minRoyalty: 5000,
      maxRoyalty: 200,
    });
    expect(r.royalty).toBeCloseTo(100); // valor calculado, dentro do teto
    expect(r.royalty).toBeLessThanOrEqual(200); // nunca acima do teto
    expect(r.minApplied).toBe(false); // piso inválido não é aplicado
  });
});

describe("computeRoyalty — guarda de configuração inválida (piso > teto)", () => {
  it("piso > teto: respeita o teto e NÃO aplica o piso inválido (achado do #5)", () => {
    // gross = 1.000.000 * 5% = 50.000; piso 100.000 > teto 80.000 (inválido)
    const r = computeRoyalty(1_000_000, {
      royaltyType: "percentual",
      percentage: 5,
      minRoyalty: 100_000,
      maxRoyalty: 80_000,
    });
    expect(r.royalty).toBeLessThanOrEqual(80_000); // nunca acima do teto
    expect(r.royalty).toBeCloseTo(50_000); // fica no valor calculado (dentro do teto)
    expect(r.minApplied).toBe(false); // piso inválido é ignorado
  });

  it("piso <= teto continua funcionando normalmente", () => {
    const r = computeRoyalty(100, {
      royaltyType: "percentual",
      percentage: 10,
      minRoyalty: 50,
      maxRoyalty: 200,
    });
    expect(r.royalty).toBeCloseTo(50); // 10 < piso 50 → aplica piso
    expect(r.minApplied).toBe(true);
  });
});
