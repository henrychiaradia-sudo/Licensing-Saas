import { describe, it, expect } from "vitest";
import { computeCost } from "@/lib/costing";

describe("computeCost — formação de custo/preço", () => {
  it("calcula CIF, custo total, preço sugerido e margem", () => {
    const r = computeCost({
      fob: 18.0,
      freightIntl: 2.5,
      insurance: 0.3,
      ii: 4.16,
      icms: 4.5,
      pis: 0.34,
      cofins: 1.58,
      armazenagem: 0.4,
      desembaraco: 0.6,
      comissao: 1.0,
      royalties: 1.8,
      marketing: 0.9,
      trade: 0.5,
      logistica: 0.8,
      markupPct: 120,
    });
    expect(r.cif).toBeCloseTo(20.8, 4);
    expect(r.impostos).toBeCloseTo(10.58, 4);
    expect(r.custosImportacao).toBeCloseTo(1.0, 4);
    expect(r.outrosCustos).toBeCloseTo(5.0, 4);
    expect(r.custoTotal).toBeCloseTo(37.38, 4);
    expect(r.precoSugerido).toBeCloseTo(82.236, 3);
    expect(r.margemPct).toBeCloseTo(54.544, 2);
  });

  it("markup 0 → preço = custo total e margem 0", () => {
    const r = computeCost({ fob: 100, markupPct: 0 });
    expect(r.custoTotal).toBeCloseTo(100, 4);
    expect(r.precoSugerido).toBeCloseTo(100, 4);
    expect(r.margemPct).toBeCloseTo(0, 4);
  });

  it("entrada vazia → tudo zero (sem NaN)", () => {
    const r = computeCost({});
    expect(r.custoTotal).toBe(0);
    expect(r.precoSugerido).toBe(0);
    expect(r.margemPct).toBe(0);
  });

  it("custo industrial entra no custo total (produto nacional)", () => {
    const r = computeCost({ custoIndustrial: 40, markupPct: 100 });
    expect(r.custoTotal).toBeCloseTo(40, 4);
    expect(r.precoSugerido).toBeCloseTo(80, 4);
    expect(r.margemPct).toBeCloseTo(50, 4);
  });

  it("aceita strings numéricas (numeric do Drizzle)", () => {
    const r = computeCost({ fob: "10" as unknown as number, markupPct: "50" as unknown as number });
    expect(r.custoTotal).toBeCloseTo(10, 4);
    expect(r.precoSugerido).toBeCloseTo(15, 4);
  });
});

describe("computeCost — casos-limite", () => {
  it("custo industrial NÃO entra em 'outrosCustos', só no custo total", () => {
    const r = computeCost({ comissao: 1, custoIndustrial: 40 });
    expect(r.outrosCustos).toBeCloseTo(1, 4); // sem o custo industrial
    expect(r.custoTotal).toBeCloseTo(41, 4); // com o custo industrial
  });
  it("custo total zero com markup → preço 0 e margem 0 (sem divisão por zero)", () => {
    const r = computeCost({ markupPct: 150 });
    expect(r.precoSugerido).toBe(0);
    expect(r.margemPct).toBe(0);
  });
  it("markup 100% → preço = 2× custo e margem bruta 50%", () => {
    const r = computeCost({ fob: 50, markupPct: 100 });
    expect(r.precoSugerido).toBeCloseTo(100, 4);
    expect(r.margemPct).toBeCloseTo(50, 4);
  });
  it("valores inválidos (NaN/Infinity) são tratados como 0", () => {
    const r = computeCost({
      fob: Number.NaN,
      freightIntl: Number.POSITIVE_INFINITY,
      markupPct: 50,
    });
    expect(r.custoTotal).toBe(0);
    expect(r.precoSugerido).toBe(0);
  });
});
