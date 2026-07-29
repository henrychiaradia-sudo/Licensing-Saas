import Link from "next/link";
import {
  ArrowRight,
  LogIn,
  FileText,
  ShoppingCart,
  BarChart3,
  ShieldCheck,
  Mail,
  Phone,
  Clock,
  Check,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { SUPPORT, whatsappLink } from "@/lib/support";
import { WhatsappButton, WhatsappIcon } from "@/components/whatsapp-button";
import { AlianzaLogo } from "@/components/logo";

export default async function LandingPage() {
  const session = await getSession();
  const loggedIn = !!session;

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      {/* halo de gradiente no topo */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-blue-50 via-cyan-50/40 to-transparent dark:from-blue-950/30 dark:via-cyan-950/10" />

      <div className="relative">
        {/* NAV */}
        <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <AlianzaLogo tileSize={36} wordClassName="text-lg" />
          <div className="flex items-center gap-3">
            <a href="#atendimento" className="hidden text-sm font-medium text-neutral-500 hover:text-blue-600 sm:block">
              Atendimento
            </a>
            <Link
              href={loggedIn ? "/dashboard" : "/login"}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              {loggedIn ? "Ir para o painel" : "Entrar"} <ArrowRight size={15} />
            </Link>
          </div>
        </header>

        {/* HERO */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-16 pt-8 lg:grid-cols-2 lg:pt-14">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" /> The Operating System for Brand Licensing
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Inteligência que conecta marcas.{" "}
              <span className="alz-gradient-text">Parcerias que geram valor.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-neutral-500">
              A plataforma completa para gerenciar todo o ciclo de licenciamento de marcas — com
              controle, dados e performance em tempo real.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href={loggedIn ? "/dashboard" : "/login"}
                className="inline-flex items-center gap-2 rounded-xl alz-gradient px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-opacity hover:opacity-90"
              >
                <LogIn size={16} /> {loggedIn ? "Acessar o painel" : "Acessar o sistema"}
              </Link>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:border-emerald-400 hover:text-emerald-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              >
                <WhatsappIcon size={16} /> Falar com atendimento
              </a>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-neutral-500">
              <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> Multi-tenant</span>
              <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> Auditoria forense</span>
              <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> 2FA & RBAC</span>
              <span className="inline-flex items-center gap-1.5"><Check size={14} className="text-emerald-500" /> Dois portais externos</span>
            </div>
          </div>

          {/* Mockup de dashboard (ilustração) */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-blue-400/20 to-cyan-400/20 blur-2xl" />
            <DashboardArt />
          </div>
        </section>

        {/* FEATURES */}
        <section className="mx-auto max-w-6xl px-6 py-10">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature icon={<FileText size={20} />} title="Contratos & Royalties" desc="Cadastro, aditivos, motor de royalties escalonado e faturamento." />
            <Feature icon={<ShoppingCart size={20} />} title="Suprimentos & Sourcing" desc="Requisição, RFQ com equalização por pesos, pedidos e logística." />
            <Feature icon={<ShieldCheck size={20} />} title="Qualidade & Compliance" desc="Inspeções, não-conformidades, jurídico e trilha de auditoria." />
            <Feature icon={<BarChart3 size={20} />} title="BI & Governança" desc="Dashboards, notificações inteligentes e perfis de acesso (RBAC)." />
          </div>
        </section>

        {/* ATENDIMENTO */}
        <section id="atendimento" className="mx-auto max-w-6xl px-6 py-14">
          <div className="rounded-3xl border border-neutral-200 bg-gradient-to-br from-neutral-50 to-white p-8 dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-950 sm:p-12">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-bold sm:text-3xl">Precisa de ajuda? Fale com a gente</h2>
              <p className="mt-3 text-neutral-500">
                Nosso time de atendimento tira suas dúvidas e ajuda a começar. Escolha o canal que preferir.
              </p>
            </div>
            <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center rounded-2xl border border-neutral-200 bg-white p-6 text-center transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#25D366]/10 text-[#25D366]">
                  <WhatsappIcon size={22} />
                </span>
                <span className="mt-3 text-sm font-semibold">WhatsApp</span>
                <span className="mt-0.5 text-xs text-neutral-500">{SUPPORT.whatsappDisplay}</span>
              </a>
              <a
                href={`mailto:${SUPPORT.email}`}
                className="group flex flex-col items-center rounded-2xl border border-neutral-200 bg-white p-6 text-center transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60">
                  <Mail size={22} />
                </span>
                <span className="mt-3 text-sm font-semibold">E-mail (SAC)</span>
                <span className="mt-0.5 text-xs text-neutral-500">{SUPPORT.email}</span>
              </a>
              <a
                href={`tel:${SUPPORT.phone.replace(/\s/g, "")}`}
                className="group flex flex-col items-center rounded-2xl border border-neutral-200 bg-white p-6 text-center transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60">
                  <Phone size={22} />
                </span>
                <span className="mt-3 text-sm font-semibold">Telefone</span>
                <span className="mt-0.5 text-xs text-neutral-500">{SUPPORT.phone}</span>
              </a>
            </div>
            <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-neutral-400">
              <Clock size={13} /> {SUPPORT.hours}
            </p>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mx-auto max-w-6xl px-6 py-10">
          <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-200 pt-8 text-sm text-neutral-400 dark:border-neutral-800 sm:flex-row">
            <AlianzaLogo tileSize={28} wordClassName="text-sm" />
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
              <Link href="/privacidade" className="hover:text-blue-600">Privacidade</Link>
              <Link href="/termos" className="hover:text-blue-600">Termos de uso</Link>
              <span>NovaSport Global · Demo · © 2026</span>
            </div>
          </div>
        </footer>
      </div>

      <WhatsappButton />
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
        {icon}
      </span>
      <h3 className="mt-4 text-sm font-bold">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">{desc}</p>
    </div>
  );
}

/** Ilustração de dashboard (mockup em HTML/CSS) — "imagem bonita condizente para um sistema". */
function DashboardArt() {
  const bars = [42, 68, 55, 80, 63, 92, 74];
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl shadow-blue-900/10 dark:border-neutral-800 dark:bg-neutral-900">
      {/* barra de janela */}
      <div className="flex items-center gap-1.5 border-b border-neutral-100 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
        <span className="ml-3 h-5 w-40 rounded-md bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div className="p-5">
        {/* mini KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { v: "128", l: "Contratos", c: "from-blue-500 to-blue-600" },
            { v: "R$ 4,2M", l: "Royalties", c: "from-blue-500 to-cyan-500" },
            { v: "96%", l: "Aprovação", c: "from-cyan-500 to-cyan-600" },
          ].map((k) => (
            <div key={k.l} className="rounded-xl border border-neutral-100 p-3 dark:border-neutral-800">
              <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${k.c}`} />
              <div className="mt-2 text-base font-bold tabular-nums">{k.v}</div>
              <div className="text-[10px] text-neutral-400">{k.l}</div>
            </div>
          ))}
        </div>
        {/* gráfico de barras + donut */}
        <div className="mt-4 grid grid-cols-[1.6fr_1fr] gap-3">
          <div className="rounded-xl border border-neutral-100 p-3 dark:border-neutral-800">
            <div className="mb-2 h-2 w-20 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="flex h-24 items-end gap-2">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-blue-600 to-cyan-400"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-100 p-3 dark:border-neutral-800">
            <div
              className="h-20 w-20 rounded-full"
              style={{
                background: "conic-gradient(#2563eb 0 62%, #06b6d4 62% 84%, #e5e7eb 84% 100%)",
              }}
            >
              <div className="grid h-full w-full place-items-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white text-[10px] font-bold dark:bg-neutral-900">
                  62%
                </div>
              </div>
            </div>
            <div className="mt-2 h-2 w-16 rounded bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
