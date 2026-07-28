"use client";

import { useActionState } from "react";
import { Button, Input } from "@/components/ui";
import { addKpiAction, type FormState } from "../actions";

export function KpiForm({ campaignId }: { campaignId: string }) {
  const action = addKpiAction.bind(null, campaignId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });

  return (
    <form action={formAction} className="grid gap-2 sm:grid-cols-12 sm:items-end">
      <div className="sm:col-span-4">
        <Input name="name" required placeholder="KPI (ex.: Sell-out, Alcance)" className="h-9" />
      </div>
      <div className="sm:col-span-3">
        <Input name="target" type="number" step="0.01" placeholder="Meta" className="h-9" />
      </div>
      <div className="sm:col-span-2">
        <Input name="realized" type="number" step="0.01" placeholder="Realizado" className="h-9" />
      </div>
      <div className="sm:col-span-2">
        <Input name="unit" placeholder="Unid. (%, R$…)" className="h-9" />
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
