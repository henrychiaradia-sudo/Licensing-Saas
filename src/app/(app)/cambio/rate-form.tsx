"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { Button, Input, Label, Select } from "@/components/ui";
import { addFxRateAction, type FormState } from "./actions";

export function RateForm({ currencies }: { currencies: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(addFxRateAction, {
    error: null,
  });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={formAction} className="grid gap-3 sm:grid-cols-12 sm:items-end">
      <div className="sm:col-span-4">
        <Label htmlFor="r-cur">Moeda *</Label>
        <Select id="r-cur" name="currencyId" required defaultValue="">
          <option value="" disabled>
            Selecione…
          </option>
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor="r-rate">Taxa (BRL por 1) *</Label>
        <Input id="r-rate" name="rateToBase" type="number" step="0.000001" min="0" required placeholder="5,40" />
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor="r-date">Data *</Label>
        <Input id="r-date" name="rateDate" type="date" required />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="r-src">Fonte</Label>
        <Input id="r-src" name="source" placeholder="BCB" />
      </div>
      <div className="sm:col-span-12">
        <Button type="submit" disabled={pending}>
          <Plus size={14} /> {pending ? "Salvando…" : "Registrar cotação"}
        </Button>
      </div>
      {state.error && <p className="text-sm text-red-600 sm:col-span-12">{state.error}</p>}
    </form>
  );
}
