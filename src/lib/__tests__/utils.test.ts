import { describe, it, expect } from "vitest";
import { fmtBRL, fmtMoney, fmtDate, fmtPct, initials } from "@/lib/utils";

describe("fmtPct", () => {
  it("formata percentuais inteiros", () => {
    expect(fmtPct(10)).toBe("10%");
    expect(fmtPct(0)).toBe("0%");
  });
  it("respeita casas decimais", () => {
    expect(fmtPct(12.5, 1)).toBe("12,5%");
  });
  it("retorna travessão para nulo/NaN", () => {
    expect(fmtPct(null)).toBe("—");
    expect(fmtPct(undefined)).toBe("—");
    expect(fmtPct(Number.NaN)).toBe("—");
  });
});

describe("fmtDate", () => {
  it("formata data ISO curta como dd/mm/aaaa", () => {
    expect(fmtDate("2026-07-15")).toBe("15/07/2026");
  });
  it("retorna travessão para vazio/nulo", () => {
    expect(fmtDate(null)).toBe("—");
    expect(fmtDate("")).toBe("—");
  });
});

describe("fmtBRL / fmtMoney", () => {
  it("inclui símbolo e separador de milhar", () => {
    const s = fmtBRL(1000);
    expect(s).toContain("R$");
    expect(s).toContain("1.000");
  });
  it("trata nulo como travessão", () => {
    expect(fmtBRL(null)).toBe("—");
    expect(fmtMoney(null)).toBe("—");
    expect(fmtMoney("")).toBe("—");
  });
  it("fmtMoney aceita string numérica (numeric do Drizzle)", () => {
    const s = fmtMoney("1500.50", "BRL");
    expect(s).toContain("1.500");
  });
});

describe("initials", () => {
  it("pega as iniciais de até dois nomes", () => {
    expect(initials("Helena Marques")).toBe("HM");
    expect(initials("João")).toBe("J");
  });
});
