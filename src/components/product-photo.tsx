"use client";

import { useEffect, useState } from "react";
import { Maximize2, X, ExternalLink } from "lucide-react";

/**
 * Foto do produto com visualização em alta resolução.
 * O preview fica contido na ficha; ao clicar, abre um lightbox em tela cheia
 * mostrando a imagem no tamanho máximo disponível + link para abrir o original.
 */
export function ProductPhoto({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);

  // Fecha com Esc e trava o scroll do fundo enquanto o lightbox está aberto.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Ver em alta resolução"
        className="group relative inline-block cursor-zoom-in overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="max-h-72 object-contain" />
        <span className="pointer-events-none absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/45 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100">
          <span className="m-2 inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white">
            <Maximize2 size={13} /> Ampliar (alta resolução)
          </span>
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/85 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Foto em alta resolução — ${alt}`}
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 text-white/90">
            <span className="truncate text-sm font-medium">{alt}</span>
            <div className="flex items-center gap-2">
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
              >
                <ExternalLink size={13} /> Abrir original
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/20"
              >
                <X size={13} /> Fechar
              </button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-auto p-4 pb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-[92vw] cursor-default rounded-lg object-contain shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
