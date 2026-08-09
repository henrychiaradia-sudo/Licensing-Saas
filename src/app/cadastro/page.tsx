"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signUpAction, type SignUpState } from "./actions";

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? "Criando sua conta…" : "Criar minha conta grátis"}
    </button>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  autoFocus,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-neutral-700">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}

export default function CadastroPage() {
  const [state, action] = useActionState<SignUpState, FormData>(signUpAction, {});
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-lg font-bold text-white">
            A
          </div>
          <span className="text-lg font-bold tracking-wide text-neutral-800">ALIANZA</span>
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-7 shadow-sm">
          <h1 className="text-xl font-bold text-neutral-900">Criar conta da empresa</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Comece agora — sua empresa ganha um espaço próprio e seguro na plataforma.
          </p>

          <form action={action} className="mt-6 space-y-4">
            <Field label="Nome da empresa" name="companyName" placeholder="Ex.: Minha Marca Ltda" autoFocus />
            <Field label="Seu nome" name="adminName" placeholder="Nome do administrador" />
            <Field label="E-mail corporativo" name="email" type="email" placeholder="voce@empresa.com" />
            <Field label="Senha" name="password" type="password" placeholder="Mínimo 8 caracteres" />

            {state.error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
            )}

            <SubmitBtn />
          </form>

          <p className="mt-5 text-center text-sm text-neutral-500">
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-blue-600 hover:underline">
              Entrar
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-neutral-400">
          Ao criar a conta, você concorda com os{" "}
          <Link href="/termos" className="hover:underline">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="hover:underline">
            Política de Privacidade
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
