import Link from "next/link";
import { ShieldCheck, ShieldAlert, Clock, Ban, ArrowLeft } from "lucide-react";
import { verifyDocument } from "@/lib/data/generated-documents";
import { AlianzaLogo } from "@/components/logo";
import { fmtDate } from "@/lib/utils";
import { getI18n } from "@/lib/i18n-server";
import { LanguageSwitcher } from "@/components/shell/language-switcher";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="mt-0.5 text-sm text-neutral-800 dark:text-neutral-100">{value}</div>
    </div>
  );
}

export default async function VerificarCode({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { locale, t } = await getI18n();
  const res = await verifyDocument(decodeURIComponent(code));

  const banner =
    res?.status === "assinado"
      ? { Icon: ShieldCheck, title: t("verify.authentic"), cls: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300" }
      : res?.status === "aguardando_assinatura"
        ? { Icon: Clock, title: t("verify.awaiting"), cls: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300" }
        : res?.status === "cancelado"
          ? { Icon: Ban, title: t("verify.cancelled"), cls: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300" }
          : res
            ? { Icon: ShieldCheck, title: t("verify.issued"), cls: "border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200" }
            : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <AlianzaLogo tileSize={36} wordClassName="text-[18px]" />
        <LanguageSwitcher locale={locale} />
      </div>

      {!res || !banner ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30">
          <ShieldAlert size={28} className="mx-auto text-red-600" />
          <h1 className="mt-2 text-lg font-bold text-red-800 dark:text-red-300">{t("verify.notFound")}</h1>
          <p className="mt-1 text-sm text-red-700/80 dark:text-red-300/70">{t("verify.notFoundText")}</p>
          <Link
            href="/verificar"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:underline dark:text-red-300"
          >
            <ArrowLeft size={14} /> {t("verify.tryAnother")}
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className={`flex items-center gap-3 border-b p-5 ${banner.cls}`}>
            <banner.Icon size={22} />
            <div>
              <p className="text-sm font-semibold">{banner.title}</p>
              <p className="text-xs opacity-80">
                {t("verify.code")} {res.verificationCode}
              </p>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label={t("verify.fDocument")} value={res.title} />
            <Field label={t("verify.fNumber")} value={res.number} />
            <Field label={t("verify.fType")} value={res.docTypeLabel} />
            <Field label={t("verify.fLicensee")} value={res.licenseeName ?? "—"} />
            <Field label={t("verify.fIssued")} value={fmtDate(res.issuedAt)} />
            <Field label={t("verify.fStatus")} value={res.statusLabel} />
            {res.status === "assinado" && (
              <>
                <Field label={t("verify.fSigner")} value={res.signerName ?? "—"} />
                <Field label={t("verify.fCpf")} value={res.signerCpfMasked ?? "—"} />
                <Field label={t("verify.fSignedAt")} value={fmtDate(res.signedAt)} />
              </>
            )}
          </div>

          <div className="border-t border-neutral-100 px-6 py-4 dark:border-neutral-800">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              {t("verify.hash")}
            </div>
            <div className="mt-1 break-all font-mono text-xs text-neutral-600 dark:text-neutral-300">
              {res.sourceSha256}
            </div>
            <p className="mt-2 text-xs text-neutral-400">{t("verify.hashNote")}</p>
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-neutral-400">{t("verify.platform")}</p>
    </main>
  );
}
