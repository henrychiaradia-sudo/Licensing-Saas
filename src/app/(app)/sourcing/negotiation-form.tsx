"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import { addNegotiationAction, type FormState } from "./actions";

export function NegotiationForm({ eventId, quoteId }: { eventId: string; quoteId: string }) {
  const action = addNegotiationAction.bind(null, eventId, quoteId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <Input
        name="amount"
        type="number"
        min="0"
        step="0.01"
        placeholder="Novo valor negociado"
        className="h-9 w-44"
      />
      <Input name="notes" placeholder="Observação (opcional)" className="h-9 w-52" />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "…" : "Registrar rodada"}
      </Button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
