"use client";

import { useEffect } from "react";

/**
 * Fronteira de erro global (App Router). Substitui a árvore quando um erro
 * não tratado ocorre na raiz. O erro do servidor já foi capturado pelo
 * `onRequestError` (instrumentation.ts); aqui garantimos uma UI amigável e
 * registramos o `digest` no console do navegador para correlação.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error.message, error.digest ? `digest=${error.digest}` : "");
  }, [error]);

  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          background: "#f6f8fb",
          color: "#0f172a",
        }}
      >
        <div style={{ maxWidth: 440, padding: "32px 28px", textAlign: "center" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#fee2e2",
              color: "#dc2626",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            !
          </div>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px" }}>
            Algo deu errado
          </h1>
          <p style={{ fontSize: 14, color: "#64748b", margin: "0 0 20px", lineHeight: 1.5 }}>
            Tivemos um erro inesperado nesta tela. A equipe já foi notificada. Você pode tentar
            novamente.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Tentar novamente
          </button>
          {error.digest ? (
            <div style={{ marginTop: 16, fontSize: 11, color: "#94a3b8" }}>
              Código do erro: {error.digest}
            </div>
          ) : null}
        </div>
      </body>
    </html>
  );
}
