import { describe, it, expect } from "vitest";
import { equalizeQuotes } from "@/lib/data/sourcing";
import type { EqInputQuote, EqualizationWeights } from "@/lib/data/sourcing";

function q(partial: Partial<EqInputQuote> & { id: string; amount: number }): EqInputQuote {
  return {
    supplierName: null,
    currencyIso: "BRL",
    leadTimeDays: 30,
    score: 3,
    capacityScore: 50,
    complianceScore: 50,
    performanceScore: 50,
    moq: null,
    freightCost: 0,
    taxCost: 0,
    otherCost: 0,
    paymentTermsDays: 30,
    attachmentUrl: null,
    isAwarded: false,
    ...partial,
  };
}

const W = (p: Partial<EqualizationWeights> = {}): EqualizationWeights => ({
  price: 0,
  lead: 0,
  quality: 0,
  payment: 0,
  capacity: 0,
  compliance: 0,
  performance: 0,
  ...p,
});

describe("equalizeQuotes — comparador ponderado de cotações", () => {
  it("lista vazia → sem linhas e sem vencedor", () => {
    expect(equalizeQuotes(W({ price: 1 }), [])).toEqual({ rows: [], bestId: null });
  });

  it("custo landed = valor + frete + imposto + outros", () => {
    const { rows } = equalizeQuotes(W({ price: 1 }), [
      q({ id: "x", amount: 100, freightCost: 10, taxCost: 5, otherCost: 2 }),
    ]);
    expect(rows[0].landed).toBeCloseTo(117);
  });

  it("cotação única recebe priceScore 100 e é a vencedora", () => {
    const { rows, bestId } = equalizeQuotes(W({ price: 1 }), [q({ id: "solo", amount: 500 })]);
    expect(rows).toHaveLength(1);
    expect(rows[0].priceScore).toBe(100);
    expect(rows[0].rank).toBe(1);
    expect(bestId).toBe("solo");
  });

  it("preço: mais barato pontua 100, mais caro pontua 0 (menor é melhor)", () => {
    const { rows } = equalizeQuotes(W({ price: 1 }), [
      q({ id: "caro", amount: 200 }),
      q({ id: "barato", amount: 100 }),
    ]);
    const barato = rows.find((r) => r.id === "barato")!;
    const caro = rows.find((r) => r.id === "caro")!;
    expect(barato.priceScore).toBe(100);
    expect(caro.priceScore).toBe(0);
  });

  it("qualidade em estrelas (0–5) é escalada para 0–100 (×20)", () => {
    const { rows } = equalizeQuotes(W({ quality: 1 }), [q({ id: "a", amount: 100, score: 5 })]);
    expect(rows[0].qualityScore).toBe(100);
  });

  it("a MELHOR pode NÃO ser a mais barata quando a qualidade domina os pesos", () => {
    // barato tem qualidade baixa; caro tem qualidade máxima; peso qualidade >> preço
    const { rows, bestId } = equalizeQuotes(W({ price: 1, quality: 4 }), [
      q({ id: "barato", amount: 100, score: 1 }), // landed 100, qual 20
      q({ id: "caro", amount: 200, score: 5 }), // landed 200, qual 100
    ]);
    // barato: (100*1 + 20*4)/5 = 36 ; caro: (0*1 + 100*4)/5 = 80
    expect(bestId).toBe("caro");
    expect(rows[0].id).toBe("caro");
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(2);
  });

  it("prazo de pagamento: maior é melhor (normHigh)", () => {
    const { rows } = equalizeQuotes(W({ payment: 1 }), [
      q({ id: "curto", amount: 100, paymentTermsDays: 30 }),
      q({ id: "longo", amount: 100, paymentTermsDays: 90 }),
    ]);
    expect(rows.find((r) => r.id === "longo")!.paymentScore).toBe(100);
    expect(rows.find((r) => r.id === "curto")!.paymentScore).toBe(0);
  });

  it("pesos todos zero não quebra (divide por 1) e ainda ranqueia", () => {
    const { rows, bestId } = equalizeQuotes(W(), [
      q({ id: "a", amount: 100 }),
      q({ id: "b", amount: 200 }),
    ]);
    expect(rows.every((r) => r.weightedTotal === 0)).toBe(true);
    expect(bestId).not.toBeNull();
  });

  it("nota técnica = média de qualidade, capacidade, compliance e performance", () => {
    const { rows } = equalizeQuotes(W({ price: 1 }), [
      q({ id: "a", amount: 100, score: 5, capacityScore: 80, complianceScore: 60, performanceScore: 40 }),
    ]);
    // (100 + 80 + 60 + 40) / 4 = 70
    expect(rows[0].technicalScore).toBe(70);
  });
});
