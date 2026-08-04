import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // DATABASE_URL fictícia: os módulos da camada de dados instanciam o cliente
    // postgres no import (de forma preguiçosa — nenhuma conexão é aberta nos testes).
    env: { DATABASE_URL: "postgres://user:pass@localhost:5432/test" },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` vira um módulo vazio nos testes (ver src/test/server-only-stub.ts).
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
});
