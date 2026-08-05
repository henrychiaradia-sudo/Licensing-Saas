import Link from "next/link";
import { ShieldCheck, ShieldAlert, Clock, Ban, ArrowLeft } from "lucide-react";
import { verifyDocument } from "@/lib/data/generated-documents";
import { AlianzaLogo } from "@/components/logo";
import { fmtDate } from "@/lib/utils";

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
  const res = await verifyDocument(decodeURIComponent(code));

  const banner =
    res?.status === "assinado"
      ? { tone: "good", Icon: ShieldCheck, title: "Documento autêntico e assinado", cls: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300" }
      : res?.status === "aguardando_assinatura"
        ? { tone: "warn", Icon: Clock, title: "Documento emitido — aguardando assinatura", cls: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300" }
        : res?.status === "cancelado"
          ? { tone: "danger", Icon: Ban, title: "Documento cancelado", cls: "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300" }
          : res
            ? { tone: "neutral", Icon: ShieldCheck, title: "Documento emitido", cls: "border-neutral-200 bg-neutral-50 text-neutral-700 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200" }
            : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex justify-center">
        <AlianzaLogo tileSize={36} wordClassName="text-[18px]" />
      </div>

      {!res || !banner ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/30">
          <ShieldAlert size={28} className="mx-auto text-red-600" />
          <h1 className="mt-2 text-lg font-bold text-red-800 dark:text-red-300">
            Código não encontrado
          </h1>
          <p className="mt-1 text-sm text-red-700/80 dark:text-red-300/70">
            Não localizamos nenhum documento com o código informado. Confira o código no rodapé do documento.
          </p>
          <Link
            href="/verificar"
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:underline dark:text-red-300"
          >
            <ArrowLeft size={14} /> Tentar outro código
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className={`flex items-center gap-3 border-b p-5 ${banner.cls}`}>
            <banner.Icon size={22} />
            <div>
              <p className="text-sm font-semibold">{banner.title}</p>
              <p className="text-xs opacity-80">Código {res.verificationCode}</p>
            </div>
          </div>

          <div className="grid gap-4 p-6 sm:grid-cols-2">
            <Field label="Documento" value={res.title} />
            <Field label="Número" value={res.number} />
            <Field label="Tipo" value={res.docTypeLabel} />
            <Field label="Licenciado" value={res.licenseeName ?? "—"} />
            <Field label="Emitido em" value={fmtDate(res.issuedAt)} />
            <Field label="Situação" value={res.statusLabel} />
            {res.status === "assinado" && (
              <>
                <Field label="Signatário" value={res.signerName ?? "—"} />
                <Field label="CPF" value={res.signerCpfMasked ?? "—"} />
                <Field label="Assinado em" value={fmtDate(res.signedAt)} />
              </>
            )}
          </div>

          <div className="border-t border-neutral-100 px-6 py-4 dark:border-neutral-800">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Hash SHA-256 do documento
            </div>
            <div className="mt-1 break-all font-mono text-xs text-neutral-600 dark:text-neutral-300">
              {res.sourceSha256}
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              A integridade é garantida por resumo criptográfico. Qualquer alteração no conteúdo do documento
              produz um hash diferente do apresentado acima.
            </p>
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-neutral-400">Plataforma de Licenciamento ALIANZA</p>
    </main>
  );
}
