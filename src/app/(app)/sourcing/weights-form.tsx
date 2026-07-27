"use client";

import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { setWeightsAction, type FormState } from "./actions";

type Weights = { price: number; lead: number; quality: number; payment: number };

export function WeightsForm({ eventId, weights }: { eventId: string; weights: Weights }) {
  const action = setWeightsAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <WeightField name="price" label="Preço" value={weights.price} />
      <WeightField name="lead" label="Prazo" value={weights.lead} />
      <WeightField name="quality" label="Qualidade" value={weights.quality} />
      <WeightField name="payment" label="Pagamento" value={weights.payment} />
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Salvando…" : "Aplicar pesos"}
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

function WeightField({ name, label, value }: { name: string; label: string; value: number }) {
  return (
    <div className="w-24">
      <Label htmlFor={`w-${name}`} className="text-xs">
        {label} (%)
      </Label>
      <Input id={`w-${name}`} name={name} type="number" min="0" max="100" step="5" defaultValue={value} />
    </div>
  );
}
