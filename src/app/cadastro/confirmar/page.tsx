import Link from "next/link";
import { getPendingByToken } from "@/lib/data/onboarding";
import { ConfirmForm } from "./confirm-form";

function Brand() {
  return (
    <div className="mb-6 flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
        A
      </div>
      <span className="text-lg font-bold tracking-wide text-neutral-800">ALIANZA</span>
    </div>
  );
}

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const pending = token ? await getPendingByToken(token) : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-md">
        <Brand />

        {pending ? (
          <div className="rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm">
            <h1 className="text-xl font-bold text-neutral-900">Confirmar cadastro</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Falta só um passo para ativar a conta da empresa{" "}
              <strong className="text-neutral-900">{pending.companyName}</strong>. Confirme abaixo
              para entrar como <strong className="text-neutral-900">{pending.email}</strong>.
            </p>
            <ConfirmForm token={token as string} />
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-3xl">
              ⚠️
            </div>
            <h1 className="text-xl font-bold text-neutral-900">Link inválido ou expirado</h1>
            <p className="mt-2 text-sm text-neutral-600">
              Este link de confirmação não é mais válido — ele pode já ter sido usado ou expirado
              (validade de 24 horas).
            </p>
            <Link
              href="/cadastro"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Fazer o cadastro novamente
            </Link>
            <div className="mt-3">
              <Link href="/login" className="text-sm font-medium text-blue-600 hover:underline">
                Já tem conta? Entrar
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
