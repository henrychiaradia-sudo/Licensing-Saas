"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { setWeightsAction, type FormState } from "./actions";

export type Weights = {
  price: number;
  lead: number;
  quality: number;
  payment: number;
  capacity: number;
  compliance: number;
  performance: number;
};

const FIELDS: { name: keyof Weights; label: string }[] = [
  { name: "price", label: "Preço" },
  { name: "lead", label: "Prazo" },
  { name: "quality", label: "Qualidade" },
  { name: "capacity", label: "Capacidade" },
  { name: "compliance", label: "Compliance" },
  { name: "performance", label: "Performance" },
  { name: "payment", label: "Pagamento" },
];

export function WeightsForm({ eventId, weights }: { eventId: string; weights: Weights }) {
  const action = setWeightsAction.bind(null, eventId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });
  const [vals, setVals] = useState<Weights>(weights);

  const total = FIELDS.reduce((s, f) => s + (Number(vals[f.name]) || 0), 0);

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        {FIELDS.map((f) => (
          <div key={f.name} className="w-[104px]">
            <Label htmlFor={`w-${f.name}`} className="text-xs">
              {f.label}
            </Label>
            <Input
              id={`w-${f.name}`}
              name={f.name}
              type="number"
              min="0"
              max="100"
              step="5"
              value={vals[f.name]}
              onChange={(e) =>
                setVals((v) => ({ ...v, [f.name]: Number(e.target.value) || 0 }))
              }
            />
          </div>
        ))}
        <div className="flex flex-col">
          <span className="mb-1.5 text-xs font-medium text-neutral-400">Soma</span>
          <span className="flex h-9 items-center rounded-lg bg-neutral-100 px-3 text-sm font-semibold tabular-nums dark:bg-neutral-800">
            {total}
          </span>
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "Salvando…" : "Aplicar pesos"}
        </Button>
      </div>
      <p className="text-[11px] text-neutral-400">
        Os pesos são normalizados pela soma — não precisam totalizar 100. Preço, prazo e pagamento
        são comparados por rodada; qualidade, capacidade, compliance e performance usam a nota
        absoluta (0–100).
      </p>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
