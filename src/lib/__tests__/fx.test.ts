import { describe, it, expect } from "vitest";
import { convertToBase, currencyOptionsFrom, type CurrencyRate } from "@/lib/data/fx";

describe("convertToBase — conversão para a moeda base (BRL)", () => {
  it("multiplica o valor nativo pela taxa (BRL por 1 unidade)", () => {
    expect(convertToBase(100, 5.25)).toBeCloseTo(525); // 100 USD × 5,25
    expect(convertToBase(1000, 6.1)).toBeCloseTo(6100); // 1000 EUR × 6,10
  });
  it("taxa 1 (própria base) devolve o mesmo valor", () => {
    expect(convertToBase(1234.56, 1)).toBeCloseTo(1234.56);
  });
  it("valor zero → zero", () => {
    expect(convertToBase(0, 5.25)).toBe(0);
  });
  it("preserva sinal (estornos/negativos)", () => {
    expect(convertToBase(-100, 5)).toBeCloseTo(-500);
  });
});

function cr(partial: Partial<CurrencyRate> & { id: string; isoCode: string; name: string; isBase: boolean }): CurrencyRate {
  return {
    symbol: null,
    current: 5,
    previous: 5,
    changePct: 0,
    rateDate: null,
    history: [],
    ...partial,
  };
}

describe("currencyOptionsFrom — opções de moeda (exclui a base)", () => {
  const rates: CurrencyRate[] = [
    cr({ id: "brl", isoCode: "BRL", name: "Real", isBase: true }),
    cr({ id: "usd", isoCode: "USD", name: "Dólar Americano", isBase: false }),
    cr({ id: "eur", isoCode: "EUR", name: "Euro", isBase: false }),
  ];
  it("remove a moeda base e monta rótulo ISO — nome", () => {
    const opts = currencyOptionsFrom(rates);
    expect(opts).toHaveLength(2);
    expect(opts.map((o) => o.id)).toEqual(["usd", "eur"]);
    expect(opts[0].label).toBe("USD — Dólar Americano");
  });
  it("lista vazia → sem opções", () => {
    expect(currencyOptionsFrom([])).toHaveLength(0);
  });
});
