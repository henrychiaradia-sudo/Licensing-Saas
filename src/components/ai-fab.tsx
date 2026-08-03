import Link from "next/link";
import { Sparkles } from "lucide-react";

/** Botão flutuante do Assistente de IA, fixo no canto inferior direito. */
export function AiAssistantButton() {
  return (
    <Link
      href="/ia"
      aria-label="Assistente de IA"
      title="Assistente de IA"
      className="group fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-full alz-gradient py-3 pl-3.5 pr-4 text-white shadow-lg shadow-violet-600/30 transition-all hover:pr-5"
    >
      <Sparkles size={24} />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold opacity-0 transition-all duration-300 group-hover:max-w-[160px] group-hover:opacity-100">
        Assistente IA
      </span>
    </Link>
  );
}
