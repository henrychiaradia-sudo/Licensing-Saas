import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { AlianzaLogo } from "@/components/logo";
import { Button, Input } from "@/components/ui";
import { getI18n } from "@/lib/i18n-server";
import { LanguageSwitcher } from "@/components/shell/language-switcher";

export default async function VerificarHome() {
  const { locale, t } = await getI18n();

  async function go(formData: FormData) {
    "use server";
    const code = String(formData.get("code") ?? "").trim();
    if (code) redirect(`/verificar/${encodeURIComponent(code)}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <AlianzaLogo tileSize={36} wordClassName="text-[18px]" />
        <LanguageSwitcher locale={locale} />
      </div>
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mb-1 flex items-center gap-2">
          <ShieldCheck size={18} className="text-blue-600" />
          <h1 className="text-lg font-bold">{t("verify.title")}</h1>
        </div>
        <p className="mb-4 text-sm text-neutral-500">{t("verify.subtitle")}</p>
        <form action={go} className="flex flex-wrap gap-2">
          <Input name="code" placeholder="ALZ-XXXX-XXXX" className="flex-1" required />
          <Button type="submit">{t("verify.button")}</Button>
        </form>
      </div>
      <p className="mt-6 text-center text-xs text-neutral-400">{t("verify.platform")}</p>
    </main>
  );
}
