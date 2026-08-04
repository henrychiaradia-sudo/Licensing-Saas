import { describe, it, expect } from "vitest";
import { fmtBRL, fmtMoney, fmtCompactBRL, fmtDate, fmtPct, initials } from "@/lib/utils";

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
  it("limita a 2 iniciais em nomes com 3+ partes", () => {
    expect(initials("Ana Paula Souza")).toBe("AP");
  });
});

describe("fmtCompactBRL", () => {
  it("formata em notação compacta com R$", () => {
    const s = fmtCompactBRL(851400);
    expect(s).toContain("R$");
    expect(s.toLowerCase()).toMatch(/mil|851/);
  });
  it("nulo/vazio/NaN → travessão", () => {
    expect(fmtCompactBRL(null)).toBe("—");
    expect(fmtCompactBRL("")).toBe("—");
    expect(fmtCompactBRL("abc")).toBe("—");
  });
  it("aceita string numérica (numeric do Drizzle)", () => {
    expect(fmtCompactBRL("2700000")).toContain("R$");
  });
});

describe("fmtMoney — moeda estrangeira", () => {
  it("formata em outra moeda (ex.: USD) com separador de milhar", () => {
    const s = fmtMoney(1500, "USD");
    expect(s).toContain("1.500");
  });
});

describe("fmtDate — objeto Date e entradas inválidas", () => {
  it("aceita objeto Date", () => {
    expect(fmtDate(new Date("2026-07-15T00:00:00"))).toBe("15/07/2026");
  });
  it("string inválida → travessão", () => {
    expect(fmtDate("not-a-date")).toBe("—");
  });
});
