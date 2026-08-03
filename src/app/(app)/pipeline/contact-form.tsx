"use client";

import { useActionState, useEffect, useRef } from "react";
import { UserPlus } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { addContactAction, type SubState } from "./actions";

export function ContactForm({ opportunityId }: { opportunityId: string }) {
  const action = addContactAction.bind(null, opportunityId);
  const [state, formAction, pending] = useActionState<SubState, FormData>(action, { error: null });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={formAction} className="grid items-center gap-2 sm:grid-cols-12">
      <Input name="name" placeholder="Nome *" required className="sm:col-span-3" />
      <Input name="role" placeholder="Cargo / papel" className="sm:col-span-3" />
      <Input name="email" placeholder="E-mail" className="sm:col-span-2" />
      <Input name="phone" placeholder="Telefone" className="sm:col-span-2" />
      <label className="flex items-center gap-1.5 text-xs text-neutral-500 sm:col-span-1">
        <input type="checkbox" name="isPrimary" className="h-4 w-4 rounded border-neutral-300" /> Princ.
      </label>
      <Button type="submit" disabled={pending} size="sm" className="sm:col-span-1">
        <UserPlus size={14} />
      </Button>
      {state.error && <p className="text-xs text-red-600 sm:col-span-12">{state.error}</p>}
    </form>
  );
}
