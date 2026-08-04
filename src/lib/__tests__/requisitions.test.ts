import { describe, it, expect } from "vitest";
import { requisitionAlcada } from "@/lib/data/requisitions";

describe("requisitionAlcada — alçada por valor estimado da requisição", () => {
  it("até R$ 50 mil → Gestor de Suprimentos", () => {
    expect(requisitionAlcada(0).level).toBe("gestor");
    expect(requisitionAlcada(25_000).level).toBe("gestor");
    expect(requisitionAlcada(50_000).level).toBe("gestor"); // limite inclusivo
  });
  it("de R$ 50 mil a R$ 200 mil → Diretor", () => {
    expect(requisitionAlcada(50_000.01).level).toBe("diretor");
    expect(requisitionAlcada(120_000).level).toBe("diretor");
    expect(requisitionAlcada(200_000).level).toBe("diretor"); // limite inclusivo
  });
  it("acima de R$ 200 mil → Diretoria", () => {
    expect(requisitionAlcada(200_000.01).level).toBe("diretoria");
    expect(requisitionAlcada(1_000_000).level).toBe("diretoria");
  });
  it("retorna rótulo e nota descritiva coerentes", () => {
    const a = requisitionAlcada(300_000);
    expect(a.label).toBe("Diretoria");
    expect(a.note).toContain("200");
  });
});
