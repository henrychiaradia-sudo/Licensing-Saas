import { describe, it, expect } from "vitest";
import { requiredTiers } from "@/lib/data/approvals";

type T = { id: string; sequence: number; label: string; threshold: string | number };

const tiers: T[] = [
  { id: "a", sequence: 1, label: "Gestor", threshold: 0 },
  { id: "b", sequence: 2, label: "Diretor", threshold: 50_000 },
  { id: "c", sequence: 3, label: "Diretoria", threshold: 200_000 },
];

describe("requiredTiers — níveis de alçada cumulativos por valor", () => {
  it("inclui todos os níveis com threshold ≤ valor, em ordem de sequência", () => {
    const req = requiredTiers(tiers, 120_000);
    expect(req.map((t) => t.id)).toEqual(["a", "b"]); // 0 e 50k, mas não 200k
  });
  it("valor alto exige todos os níveis", () => {
    expect(requiredTiers(tiers, 500_000).map((t) => t.id)).toEqual(["a", "b", "c"]);
  });
  it("limite exatamente igual ao threshold conta como exigido (inclusivo)", () => {
    expect(requiredTiers(tiers, 50_000).map((t) => t.id)).toEqual(["a", "b"]);
  });
  it("sempre exige ao menos um nível (o de menor sequência), mesmo abaixo de tudo", () => {
    const semZero: T[] = [
      { id: "b", sequence: 2, label: "Diretor", threshold: 50_000 },
      { id: "c", sequence: 3, label: "Diretoria", threshold: 200_000 },
    ];
    const req = requiredTiers(semZero, 10_000); // nenhum threshold ≤ 10k
    expect(req.map((t) => t.id)).toEqual(["b"]); // fallback: menor sequência
  });
  it("ordena por sequência mesmo com entrada fora de ordem", () => {
    const embaralhado = [tiers[2], tiers[0], tiers[1]];
    expect(requiredTiers(embaralhado, 999_999).map((t) => t.sequence)).toEqual([1, 2, 3]);
  });
  it("aceita threshold como string (numeric do Drizzle)", () => {
    const strTiers: T[] = [
      { id: "a", sequence: 1, label: "Gestor", threshold: "0" },
      { id: "b", sequence: 2, label: "Diretor", threshold: "50000" },
    ];
    expect(requiredTiers(strTiers, 60_000).map((t) => t.id)).toEqual(["a", "b"]);
  });
});
