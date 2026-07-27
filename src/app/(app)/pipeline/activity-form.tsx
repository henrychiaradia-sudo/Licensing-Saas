"use client";

import { useActionState } from "react";
import { Button, Input, Select } from "@/components/ui";
import { addActivityAction, type FormState } from "./actions";

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "nota", label: "Nota" },
  { value: "ligacao", label: "Ligação" },
  { value: "reuniao", label: "Reunião" },
  { value: "email", label: "E-mail" },
  { value: "proposta", label: "Proposta" },
];

export function ActivityForm({ opportunityId }: { opportunityId: string }) {
  const action = addActivityAction.bind(null, opportunityId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <Select name="activityType" defaultValue="nota" className="h-9 w-32">
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
      <Input name="description" placeholder="Descreva a interação…" className="h-9 flex-1 min-w-[220px]" />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "…" : "Registrar"}
      </Button>
      {state?.error && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
