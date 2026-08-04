import { describe, it, expect } from "vitest";
import { nextPoStatus, PO_FLOW } from "@/lib/data/purchase-orders";

describe("nextPoStatus — máquina de estados do pedido de compra", () => {
  it("avança na ordem do fluxo", () => {
    expect(nextPoStatus("rascunho")).toBe("enviado");
    expect(nextPoStatus("enviado")).toBe("confirmado");
    expect(nextPoStatus("confirmado")).toBe("em_producao");
    expect(nextPoStatus("em_producao")).toBe("embarcado");
    expect(nextPoStatus("embarcado")).toBe("recebido");
  });
  it("o último estado do fluxo não avança", () => {
    expect(nextPoStatus("recebido")).toBeNull();
  });
  it("status fora do fluxo (ex.: cancelado) não avança", () => {
    expect(nextPoStatus("cancelado")).toBeNull();
  });
  it("o fluxo cobre toda a cadeia esperada, sem buracos", () => {
    expect(PO_FLOW).toEqual([
      "rascunho",
      "enviado",
      "confirmado",
      "em_producao",
      "embarcado",
      "recebido",
    ]);
    // cada passo (menos o último) tem um próximo bem definido
    for (let i = 0; i < PO_FLOW.length - 1; i++) {
      expect(nextPoStatus(PO_FLOW[i])).toBe(PO_FLOW[i + 1]);
    }
  });
});
