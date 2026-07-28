"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import type { FormState } from "../actions";
import { ACTION_TYPE_OPTIONS, ACTION_STATUS_OPTIONS } from "../labels";

type Option = { id: string; label: string };
export type ActionDefaults = {
  name?: string;
  actionType?: string;
  status?: string;
  campaignId?: string | null;
  channel?: string | null;
  territorio?: string | null;
  agencyId?: string | null;
  influencerId?: string | null;
  budget?: string | number | null;
  spent?: string | number | null;
  revenue?: string | number | null;
  reachTarget?: string | number | null;
  reachActual?: string | number | null;
  coop?: boolean;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  evidenceUrl?: string | null;
  resultNotes?: string | null;
  notes?: string | null;
};

export function ActionForm({
  action,
  campaigns,
  agencies,
  influencers,
  defaults,
  submitLabel = "Registrar ação",
  cancelHref = "/marketing/acoes",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  campaigns: Option[];
  agencies: Option[];
  influencers: Option[];
  defaults?: ActionDefaults;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, { error: null });
  const d = defaults ?? {};
  const num = (v: string | number | null | undefined) => (v != null && v !== "" ? String(v) : "");

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Nome da ação *</Label>
          <Input id="name" name="name" required defaultValue={d.name ?? ""} placeholder="Ativação PDV — Rede Extra" />
        </div>
        <div>
          <Label htmlFor="actionType">Tática *</Label>
          <Select id="actionType" name="actionType" defaultValue={d.actionType ?? "ativacao"}>
            {ACTION_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select id="status" name="status" defaultValue={d.status ?? "planejada"}>
            {ACTION_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="campaignId">Campanha</Label>
          <Select id="campaignId" name="campaignId" defaultValue={d.campaignId ?? ""}>
            <option value="">— sem campanha (avulsa)</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="channel">Canal</Label>
          <Input id="channel" name="channel" defaultValue={d.channel ?? ""} placeholder="Instagram, PDV, TV…" />
        </div>
        <div>
          <Label htmlFor="territorio">Território</Label>
          <Input id="territorio" name="territorio" defaultValue={d.territorio ?? ""} placeholder="Brasil, SP…" />
        </div>
        <div>
          <Label htmlFor="agencyId">Agência</Label>
          <Select id="agencyId" name="agencyId" defaultValue={d.agencyId ?? ""}>
            <option value="">—</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="influencerId">Influenciador</Label>
          <Select id="influencerId" name="influencerId" defaultValue={d.influencerId ?? ""}>
            <option value="">—</option>
            {influencers.map((i) => (
              <option key={i.id} value={i.id}>
                {i.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="sm:col-span-2 mt-1 border-t border-neutral-100 pt-3 text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
          Verba & resultados
        </div>
        <div>
          <Label htmlFor="budget">Orçado (R$)</Label>
          <Input id="budget" name="budget" type="number" min="0" step="0.01" defaultValue={num(d.budget)} placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="spent">Realizado (R$)</Label>
          <Input id="spent" name="spent" type="number" min="0" step="0.01" defaultValue={num(d.spent)} placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="revenue">Receita atribuída (R$)</Label>
          <Input id="revenue" name="revenue" type="number" min="0" step="0.01" defaultValue={num(d.revenue)} placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="location">Local</Label>
          <Input id="location" name="location" defaultValue={d.location ?? ""} placeholder="Loja, cidade, arena…" />
        </div>
        <div>
          <Label htmlFor="reachTarget">Alcance previsto</Label>
          <Input id="reachTarget" name="reachTarget" type="number" min="0" step="1" defaultValue={num(d.reachTarget)} placeholder="0" />
        </div>
        <div>
          <Label htmlFor="reachActual">Alcance realizado</Label>
          <Input id="reachActual" name="reachActual" type="number" min="0" step="1" defaultValue={num(d.reachActual)} placeholder="0" />
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
          <Label htmlFor="evidenceUrl">Evidência (link da peça/relatório)</Label>
          <Input id="evidenceUrl" name="evidenceUrl" defaultValue={d.evidenceUrl ?? ""} placeholder="https://…" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="resultNotes">Resultados</Label>
          <Textarea id="resultNotes" name="resultNotes" rows={2} defaultValue={d.resultNotes ?? ""} placeholder="Aprendizados, métricas, destaques…" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" name="notes" rows={2} defaultValue={d.notes ?? ""} placeholder="Escopo, fornecedores…" />
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" name="coop" defaultChecked={d.coop ?? false} className="h-4 w-4 rounded border-neutral-300" />
          Verba cooperada
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </Button>
        <Link href={cancelHref}>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
