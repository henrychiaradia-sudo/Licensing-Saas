import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AlianzaLogo } from "@/components/logo";
import { DPO, SUPPORT, LEGAL_UPDATED } from "@/lib/support";

export function LegalShell({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#081221] dark:text-slate-100">
      <header className="border-b border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <AlianzaLogo tileSize={30} wordClassName="text-[15px]" />
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600">
            <ArrowLeft size={15} /> Voltar ao site
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{title}</h1>
        <p className="mt-1 text-sm text-neutral-500">Última atualização: {LEGAL_UPDATED}</p>
        {intro && <p className="mt-4 text-[14.5px] leading-relaxed text-neutral-600 dark:text-neutral-300">{intro}</p>}
        <div className="mt-6 space-y-4 text-[14.5px] leading-relaxed text-neutral-700 dark:text-neutral-300">{children}</div>

        <div className="mt-10 flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm dark:border-blue-950/50 dark:bg-blue-950/20">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-blue-600" />
          <div>
            <p className="font-semibold text-neutral-800 dark:text-neutral-100">{DPO.name}</p>
            <p className="text-neutral-500">
              Para exercer seus direitos ou tirar dúvidas sobre o tratamento dos seus dados, fale com o encarregado:{" "}
              <a href={`mailto:${DPO.email}`} className="font-medium text-blue-600">{DPO.email}</a>.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-4 text-sm text-neutral-400">
          <Link href="/privacidade" className="hover:text-blue-600">Política de Privacidade</Link>
          <Link href="/termos" className="hover:text-blue-600">Termos de Uso</Link>
          <a href={`mailto:${SUPPORT.email}`} className="hover:text-blue-600">Suporte</a>
        </div>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 mt-4 text-[15.5px] font-semibold text-neutral-900 dark:text-white">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
