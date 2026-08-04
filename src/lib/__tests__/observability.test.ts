import { describe, it, expect, vi, afterEach } from "vitest";
import { reportError } from "@/lib/observability";

describe("reportError — reportar um erro nunca pode gerar outro erro", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.SENTRY_DSN;
  });

  it("sem SENTRY_DSN: registra no console e resolve sem lançar", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    delete process.env.SENTRY_DSN;
    await expect(reportError(new Error("boom"), { route: "/x" })).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();
  });

  it("aceita valores não-Error (string, null) sem quebrar", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(reportError("falha em texto")).resolves.toBeUndefined();
    await expect(reportError(null)).resolves.toBeUndefined();
  });

  it("DSN inválido → falha silenciosa, sem lançar e sem rede", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("não deveria chamar"));
    process.env.SENTRY_DSN = "not-a-valid-dsn";
    await expect(reportError(new Error("x"))).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled(); // DSN inválido nem tenta enviar
  });
});
