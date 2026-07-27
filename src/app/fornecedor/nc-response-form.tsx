"use client";

import { useActionState } from "react";
import { Button, Textarea } from "@/components/ui";
import { respondNcAction, type FormState } from "./actions";

export function NcResponseForm({
  ncId,
  current,
}: {
  ncId: string;
  current: string | null;
}) {
  const action = respondNcAction.bind(null, ncId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });

  return (
    <form action={formAction} className="grid gap-2">
      <Textarea
        name="correctiveAction"
        rows={2}
        defaultValue={current ?? ""}
        placeholder="Descreva o plano de ação corretiva…"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Enviando…" : "Enviar ação corretiva"}
        </Button>
        {state?.ok && <span className="text-xs text-emerald-600">Resposta registrada.</span>}
        {state?.error && <span className="text-xs text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
