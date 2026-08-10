"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { confirmAction, type ConfirmState } from "./actions";

const MSG: Record<string, string> = {
  invalid: "Este link de confirmação é inválido.",
  expired: "Este link expirou. Faça o cadastro novamente.",
  consumed: "Este link já foi usado. Tente fazer login.",
  email_taken: "Este e-mail já foi cadastrado em outra conta. Tente fazer login.",
};

function Btn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? "Ativando sua conta…" : "Confirmar meu e-mail e entrar"}
    </button>
  );
}

export function ConfirmForm({ token }: { token: string }) {
  const [state, action] = useActionState<ConfirmState, FormData>(confirmAction, {});
  return (
    <form action={action} className="mt-6 space-y-3">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {MSG[state.error] ?? "Não foi possível confirmar o cadastro."}
        </p>
      )}
      <Btn />
    </form>
  );
}
