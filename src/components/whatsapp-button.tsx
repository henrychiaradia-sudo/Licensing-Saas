import { whatsappLink } from "@/lib/support";

/** Ícone do WhatsApp (inline SVG). */
function WhatsappIcon({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M16.04 3C9.4 3 4 8.4 4 15.04c0 2.12.56 4.19 1.62 6.02L4 29l8.13-1.6a12 12 0 0 0 3.9.65h.01C22.68 28.05 28 22.66 28 16.02 28 8.4 22.68 3 16.04 3Zm0 21.9h-.01a9.9 9.9 0 0 1-3.55-.66l-.25-.1-4.82.95.98-4.7-.16-.24a9.86 9.86 0 0 1-1.5-5.2c0-5.46 4.45-9.9 9.92-9.9 2.65 0 5.14 1.04 7.01 2.9a9.82 9.82 0 0 1 2.9 7c0 5.46-4.45 9.9-9.92 9.9Zm5.44-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35Z" />
    </svg>
  );
}

/** Botão flutuante de atendimento (WhatsApp), fixo no canto inferior direito. */
export function WhatsappButton() {
  return (
    <a
      href={whatsappLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full bg-[#25D366] py-3 pl-3 pr-4 text-white shadow-lg shadow-emerald-600/30 transition-all hover:pr-5"
    >
      <WhatsappIcon />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-300 group-hover:max-w-[160px] group-hover:opacity-100">
        Fale conosco
      </span>
    </a>
  );
}

export { WhatsappIcon };
