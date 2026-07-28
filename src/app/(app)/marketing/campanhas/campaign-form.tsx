"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import type { FormState } from "../actions";
import { CAMPAIGN_TYPE_OPTIONS, CAMPAIGN_STATUS_OPTIONS } from "../labels";

type Option = { id: string; label: string };
export type CampaignDefaults = {
  name?: string;
  brandId?: string | null;
  licenseeId?: string | null;
  planId?: string | null;
  campaignType?: string;
  status?: string;
  budget?: string | number | null;
  channel?: string | null;
  goal?: string | null;
  publico?: string | null;
  territorio?: string | null;
  coop?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  notes?: string | null;
};

export function CampaignForm({
  action,
  brands,
  licensees,
  plans,
  defaults,
  submitLabel = "Criar campanha",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  brands: Option[];
  licensees: Option[];
  plans: Option[];
  defaults?: CampaignDefaults;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });
  const d = defaults ?? {};

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Nome da campanha *</Label>
          <Input id="name" name="name" required defaultValue={d.name ?? ""} placeholder="Volta às aulas 2026 — Liga Prime" />
        </div>
        <div>
          <Label htmlFor="campaignType">Tipo *</Label>
          <Select id="campaignType" name="campaignType" defaultValue={d.campaignType ?? "promocional"}>
            {CAMPAIGN_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select id="status" name="status" defaultValue={d.status ?? "planejamento"}>
            {CAMPAIGN_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="planId">Plano de marketing</Label>
          <Select id="planId" name="planId" defaultValue={d.planId ?? ""}>
            <option value="">— (opcional)</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
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
          <Label htmlFor="budget">Orçamento (R$)</Label>
          <Input
            id="budget"
            name="budget"
            type="number"
            min="0"
            step="0.01"
            defaultValue={d.budget != null ? String(d.budget) : ""}
            placeholder="0,00"
          />
        </div>
        <div>
          <Label htmlFor="channel">Canal</Label>
          <Input id="channel" name="channel" defaultValue={d.channel ?? ""} placeholder="Digital, TV, PDV, OOH…" />
        </div>
        <div>
          <Label htmlFor="territorio">Território</Label>
          <Input id="territorio" name="territorio" defaultValue={d.territorio ?? ""} placeholder="Brasil, SP, Sul…" />
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
          <Input id="publico" name="publico" defaultValue={d.publico ?? ""} placeholder="Ex.: Famílias com filhos de 6–12 anos, classes B/C" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="goal">Objetivo</Label>
          <Input id="goal" name="goal" defaultValue={d.goal ?? ""} placeholder="Ex.: +15% de sell-out na categoria" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" name="notes" rows={3} defaultValue={d.notes ?? ""} placeholder="Escopo, peças, aprovações…" />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="coop" defaultChecked={d.coop ?? false} className="h-4 w-4 rounded border-neutral-300" />
          Verba cooperada (marketing coop com licenciado)
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </Button>
        <Link href="/marketing/campanhas">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
