import Link from "next/link";
import { ShieldCheck, ArrowLeft, Check, Mail } from "lucide-react";
import { loginAction } from "./actions";
import { Button, Input, Label } from "@/components/ui";
import { SUPPORT, whatsappLink } from "@/lib/support";
import { WhatsappIcon } from "@/components/whatsapp-button";
import { AlianzaLogo, AlianzaMark } from "@/components/logo";
import { getI18n } from "@/lib/i18n-server";
import { LanguageSwitcher } from "@/components/shell/language-switcher";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; e?: string; mfa?: string }>;
}) {
  const sp = await searchParams;
  const { locale, t } = await getI18n();
  const errorMsg = sp.e ?? (sp.error ? t("login.invalid") : null);
  const mfaPrompt = sp.mfa === "1";

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ESQUERDA — formulário */}
      <div className="flex flex-col justify-center bg-white px-6 py-10 dark:bg-neutral-950">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-blue-600"
            >
              <ArrowLeft size={15} /> {t("login.back")}
            </Link>
            <LanguageSwitcher locale={locale} />
          </div>

          <div className="mb-6">
            <AlianzaLogo tileSize={38} wordClassName="text-lg" subtitle />
          </div>

          <h1 className="text-2xl font-bold">{t("login.title")}</h1>
          <p className="mb-6 mt-1 text-sm text-neutral-500">{t("login.subtitle")}</p>

          <form action={loginAction} className="grid gap-4">
            <div>
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input id="email" name="email" type="email" required defaultValue="admin@novasport.com" />
            </div>
            <div>
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input id="password" name="password" type="password" required />
            </div>
            <div>
              <Label htmlFor="code" className="flex items-center gap-1.5">
                <ShieldCheck size={13} /> {t("login.mfa")}{" "}
                <span className="font-normal text-neutral-400">{t("login.mfaHint")}</span>
              </Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className={mfaPrompt ? "border-blue-400 ring-2 ring-blue-500/30" : ""}
              />
            </div>
            {errorMsg && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">
                {errorMsg}
              </p>
            )}
            <Button type="submit" className="mt-1 w-full">
              {t("login.submit")}
            </Button>
          </form>

          <a
            href={whatsappLink("Olá! Preciso de ajuda para acessar a ALIANZA.")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:underline"
          >
            <WhatsappIcon size={15} /> {t("login.help")}
          </a>

          <div className="mt-6 space-y-1 rounded-xl border border-neutral-100 bg-neutral-50 p-3 text-xs text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900">
            <p className="font-semibold text-neutral-500">{t("login.demo")}</p>
            <p>{t("login.internal")}: <span className="font-medium">admin@novasport.com</span> / <span className="font-medium">aurora123</span></p>
            <p>{t("login.portalLicensee")}: <span className="font-medium">portal@vestebem.com</span> / <span className="font-medium">portal123</span></p>
            <p>{t("login.portalSupplier")}: <span className="font-medium">portal@pacificmfg.com</span> / <span className="font-medium">portal123</span></p>
          </div>

          <p className="mt-5 text-center text-[11.5px] text-neutral-400">
            {t("login.terms1")}{" "}
            <Link href="/termos" className="text-blue-600 hover:underline">{t("login.terms")}</Link> {t("login.and")}{" "}
            <Link href="/privacidade" className="text-blue-600 hover:underline">{t("login.privacy")}</Link>.
          </p>
        </div>
      </div>

      {/* DIREITA — painel de marca */}
      <div className="relative hidden overflow-hidden alz-gradient lg:flex lg:flex-col lg:justify-between lg:p-12 lg:text-white">
        <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-2.5 text-lg font-bold tracking-[0.12em]">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
              <AlianzaMark size={22} tone="white" />
            </span>
            ALIANZA
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight">{t("login.heroTitle")}</h2>
          <p className="mt-4 text-white/80">{t("login.heroSubtitle")}</p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {[t("login.hero1"), t("login.hero2"), t("login.hero3")].map((line) => (
              <li key={line} className="flex items-center gap-2.5">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20">
                  <Check size={13} />
                </span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
          <p className="text-sm font-semibold">{t("login.helpTitle")}</p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/85">
            <a href={whatsappLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 hover:text-white">
              <WhatsappIcon size={16} /> {SUPPORT.whatsappDisplay}
            </a>
            <a href={`mailto:${SUPPORT.email}`} className="inline-flex items-center gap-2 hover:text-white">
              <Mail size={16} /> {SUPPORT.email}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
