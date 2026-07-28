"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Em produção real, enviaria para observabilidade (Sentry etc.).
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-950">
        <AlertTriangle size={26} />
      </div>
      <h1 className="text-lg font-bold">Algo deu errado nesta tela</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Ocorreu um erro ao carregar esta página. Você pode tentar novamente — o restante do sistema
        segue funcionando normalmente.
      </p>
      {error.digest && (
        <p className="mt-2 text-[11px] tabular-nums text-neutral-400">Referência: {error.digest}</p>
      )}
      <button
        onClick={() => reset()}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        <RotateCcw size={15} /> Tentar novamente
      </button>
    </div>
  );
}
