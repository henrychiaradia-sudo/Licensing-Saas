"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { createEvaluationAction, type FormState } from "./actions";

const RISK_OPTIONS: { value: string; label: string }[] = [
  { value: "baixo", label: "Baixo" },
  { value: "medio", label: "Médio" },
  { value: "alto", label: "Alto" },
  { value: "critico", label: "Crítico" },
];

export function EvaluationForm({ supplierId }: { supplierId: string }) {
  const action = createEvaluationAction.bind(null, supplierId);
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="periodLabel">Período *</Label>
          <Input id="periodLabel" name="periodLabel" required placeholder="2026-Q2" />
        </div>
        <div>
          <Label htmlFor="riskLevel">Nível de risco *</Label>
          <Select id="riskLevel" name="riskLevel" defaultValue="medio">
            {RISK_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <ScoreField name="qualityScore" label="Qualidade" />
        <ScoreField name="deliveryScore" label="Entrega" />
        <ScoreField name="costScore" label="Custo" />
        <ScoreField name="complianceScore" label="Conformidade" />
      </div>
      <p className="-mt-2 text-xs text-neutral-400">
        Notas de 0 a 100. A nota geral é a média das quatro dimensões.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="strengths">Pontos fortes</Label>
          <Textarea id="strengths" name="strengths" rows={2} placeholder="Consistência, capacidade, prazos…" />
        </div>
        <div>
          <Label htmlFor="weaknesses">Pontos de atenção</Label>
          <Textarea id="weaknesses" name="weaknesses" rows={2} placeholder="Riscos, dependências, falhas…" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="evaluatedAt">Data da avaliação</Label>
          <Input id="evaluatedAt" name="evaluatedAt" type="date" />
        </div>
        <div>
          <Label htmlFor="notes">Observações</Label>
          <Input id="notes" name="notes" placeholder="Comentário livre" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Salvando…" : "Registrar avaliação"}
        </Button>
      </div>
    </form>
  );
}

function ScoreField({ name, label }: { name: string; label: string }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="number" min="0" max="100" step="1" defaultValue="80" />
    </div>
  );
}
