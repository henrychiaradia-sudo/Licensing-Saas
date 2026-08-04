import { describe, it, expect } from "vitest";
import { roiPct } from "@/lib/data/marketing";

describe("roiPct — retorno sobre investimento de marketing", () => {
  it("ROI% = (retorno − investimento) / investimento × 100", () => {
    expect(roiPct(1000, 3000)).toBeCloseTo(200); // ganhou 2x o investido
    expect(roiPct(1000, 1000)).toBeCloseTo(0); // empatou
    expect(roiPct(1000, 1500)).toBeCloseTo(50);
  });
  it("retorno menor que investimento → ROI negativo", () => {
    expect(roiPct(1000, 400)).toBeCloseTo(-60);
    expect(roiPct(1000, 0)).toBeCloseTo(-100);
  });
  it("investimento zero ou negativo → null (indefinido)", () => {
    expect(roiPct(0, 5000)).toBeNull();
    expect(roiPct(-10, 5000)).toBeNull();
  });
});
