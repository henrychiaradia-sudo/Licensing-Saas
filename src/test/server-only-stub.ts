// Stub de `server-only` para o ambiente de teste (vitest).
// O pacote real lança erro se importado fora de um Server Component; nos testes
// unitários das funções puras isso não se aplica, então o substituímos por um
// módulo vazio via alias no vitest.config.ts.
export {};
