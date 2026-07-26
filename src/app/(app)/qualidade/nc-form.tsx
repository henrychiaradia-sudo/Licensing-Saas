"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { addNcAction, type FormState } from "./actions";

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
];

export function NcForm({ inspectionId }: { inspectionId: string }) {
  const action = addNcAction.bind(null, inspectionId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="severity">Severidade *</Label>
          <Select id="severity" name="severity" defaultValue="media">
            {SEVERITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Descrição *</Label>
          <Input id="description" name="description" required placeholder="Costura irregular em 12 peças da amostra" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="disposition">Disposição</Label>
          <Input id="disposition" name="disposition" placeholder="Retrabalho / segregação / devolução" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="correctiveAction">Ação corretiva</Label>
          <Textarea
            id="correctiveAction"
            name="correctiveAction"
            rows={2}
            placeholder="Plano de ação acordado com o fornecedor"
          />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Registrando…" : "Adicionar não-conformidade"}
        </Button>
      </div>
    </form>
  );
}
