"use client";

import { useActionState } from "react";
import { Button, Input, Select } from "@/components/ui";
import { addActivationAction, type FormState } from "./actions";

const TYPE_OPTIONS = [
  { value: "pdv", label: "PDV" },
  { value: "digital", label: "Digital" },
  { value: "evento", label: "Evento" },
  { value: "influencer", label: "Influencer" },
  { value: "outro", label: "Outro" },
];

export function ActivationForm({ campaignId }: { campaignId: string }) {
  const action = addActivationAction.bind(null, campaignId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-12 sm:items-end">
      <div className="sm:col-span-4">
        <Input name="name" required placeholder="Nome da ativação" className="h-9" />
      </div>
      <div className="sm:col-span-2">
        <Select name="activationType" defaultValue="pdv" className="h-9">
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-2">
        <Input name="location" placeholder="Local/canal" className="h-9" />
      </div>
      <div className="sm:col-span-2">
        <Input name="cost" type="number" min="0" step="0.01" placeholder="Custo" className="h-9" />
      </div>
      <div className="sm:col-span-1">
        <Input name="scheduledAt" type="date" className="h-9" />
      </div>
      <div className="sm:col-span-1">
        <Button type="submit" size="sm" disabled={pending} className="w-full">
          {pending ? "…" : "Add"}
        </Button>
      </div>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-12">{state.error}</p>}
    </form>
  );
}
