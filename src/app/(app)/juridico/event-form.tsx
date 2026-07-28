"use client";

import { useActionState } from "react";
import { addLegalEventAction, type FormState } from "./actions";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

const EVENT_TYPE_OPTIONS = [
  { value: "andamento", label: "Andamento" },
  { value: "audiencia", label: "Audiência" },
  { value: "peticao", label: "Petição" },
  { value: "decisao", label: "Decisão" },
  { value: "acordo", label: "Acordo" },
  { value: "prazo", label: "Prazo" },
];

export function EventForm({ caseId }: { caseId: string }) {
  const action = addLegalEventAction.bind(null, caseId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[10rem_9rem_1fr_auto] sm:items-end">
      <div>
        <Label htmlFor="eventType">Tipo</Label>
        <Select id="eventType" name="eventType" defaultValue="andamento">
          {EVENT_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="occurredAt">Data</Label>
        <Input id="occurredAt" name="occurredAt" type="date" />
      </div>
      <div>
        <Label htmlFor="description">Descrição *</Label>
        <Input id="description" name="description" required placeholder="Ex.: Protocolada contestação" />
      </div>
      <div>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Salvando…" : "Registrar"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-4">{state.error}</p>}
    </form>
  );
}
