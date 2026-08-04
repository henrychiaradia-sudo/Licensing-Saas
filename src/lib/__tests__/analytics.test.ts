import { describe, it, expect } from "vitest";
import { trendDelta } from "@/lib/data/analytics";

describe("trendDelta — tendência (últimos 3 meses vs 3 anteriores)", () => {
  it("série com menos de 6 pontos → null (sem base de comparação)", () => {
    expect(trendDelta([1, 2, 3])).toBeNull();
    expect(trendDelta([1, 2, 3, 4, 5])).toBeNull();
  });
  it("crescimento: soma recente > anterior → positivo com o % correto", () => {
    // anteriores [10,10,10]=30, recentes [15,15,15]=45 → +50%
    const d = trendDelta([10, 10, 10, 15, 15, 15]);
    expect(d).not.toBeNull();
    expect(d!.positive).toBe(true);
    expect(d!.label).toBe("50%");
  });
  it("queda: soma recente < anterior → negativo, rótulo com valor absoluto", () => {
    // anteriores [20,20,20]=60, recentes [15,15,15]=45 → -25%
    const d = trendDelta([20, 20, 20, 15, 15, 15]);
    expect(d!.positive).toBe(false);
    expect(d!.label).toBe("25%");
  });
  it("variação nula (0%) → null (não polui a UI)", () => {
    expect(trendDelta([10, 10, 10, 10, 10, 10])).toBeNull();
  });
  it("base anterior zero com recente positiva → 'novo'", () => {
    const d = trendDelta([0, 0, 0, 5, 5, 5]);
    expect(d).toEqual({ label: "novo", positive: true });
  });
  it("base anterior zero e recente zero → null", () => {
    expect(trendDelta([0, 0, 0, 0, 0, 0])).toBeNull();
  });
  it("usa apenas os 6 pontos finais quando a série é mais longa", () => {
    // Os 3 primeiros pontos gigantes devem ser ignorados; conta só [.., 10,10,10, 20,20,20]
    const d = trendDelta([999, 999, 999, 10, 10, 10, 20, 20, 20]);
    expect(d!.label).toBe("100%"); // 30 → 60
    expect(d!.positive).toBe(true);
  });
});
