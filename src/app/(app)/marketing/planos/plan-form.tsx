"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import type { FormState } from "../actions";
import { PLAN_STATUS_OPTIONS } from "../labels";

type Option = { id: string; label: string };
export type PlanDefaults = {
  name?: string;
  year?: number | null;
  brandId?: string | null;
  licenseeId?: string | null;
  objetivo?: string | null;
  publico?: string | null;
  territorio?: string | null;
  budget?: string | number | null;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
};

export function PlanForm({
  action,
  brands,
  licensees,
  defaults,
  submitLabel = "Criar plano",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  brands: Option[];
  licensees: Option[];
  defaults?: PlanDefaults;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });
  const d = defaults ?? {};

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Nome do plano *</Label>
          <Input id="name" name="name" required defaultValue={d.name ?? ""} placeholder="Plano Anual de Marketing 2026 — Liga Prime" />
        </div>
        <div>
          <Label htmlFor="year">Ano</Label>
          <Input id="year" name="year" type="number" min="2000" max="2100" defaultValue={d.year != null ? String(d.year) : ""} placeholder="2026" />
        </div>
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select id="status" name="status" defaultValue={d.status ?? "rascunho"}>
            {PLAN_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="brandId">Marca</Label>
          <Select id="brandId" name="brandId" defaultValue={d.brandId ?? ""}>
            <option value="">— (opcional)</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="licenseeId">Licenciado</Label>
          <Select id="licenseeId" name="licenseeId" defaultValue={d.licenseeId ?? ""}>
            <option value="">— (opcional)</option>
            {licensees.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="budget">Verba total (R$)</Label>
          <Input id="budget" name="budget" type="number" min="0" step="0.01" defaultValue={d.budget != null ? String(d.budget) : ""} placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="territorio">Território</Label>
          <Input id="territorio" name="territorio" defaultValue={d.territorio ?? ""} placeholder="Brasil, LATAM…" />
        </div>
        <div>
          <Label htmlFor="startDate">Início</Label>
          <Input id="startDate" name="startDate" type="date" defaultValue={d.startDate ?? ""} />
        </div>
        <div>
          <Label htmlFor="endDate">Fim</Label>
          <Input id="endDate" name="endDate" type="date" defaultValue={d.endDate ?? ""} />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="publico">Público-alvo</Label>
          <Input id="publico" name="publico" defaultValue={d.publico ?? ""} placeholder="Segmentos e personas priorizados" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="objetivo">Objetivo estratégico</Label>
          <Textarea id="objetivo" name="objetivo" rows={2} defaultValue={d.objetivo ?? ""} placeholder="Metas de negócio e de marca para o período" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" name="notes" rows={2} defaultValue={d.notes ?? ""} placeholder="Diretrizes, pilares, restrições…" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </Button>
        <Link href="/marketing/planos">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
