"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { createCampaignAction, type FormState } from "./actions";

type Option = { id: string; label: string };

const TYPE_OPTIONS = [
  { value: "lancamento", label: "Lançamento" },
  { value: "sazonal", label: "Sazonal" },
  { value: "promocional", label: "Promocional" },
  { value: "institucional", label: "Institucional" },
  { value: "cobranding", label: "Co-branding" },
];
const STATUS_OPTIONS = [
  { value: "planejamento", label: "Planejamento" },
  { value: "ativa", label: "Ativa" },
  { value: "pausada", label: "Pausada" },
];

export function CampaignForm({ brands, licensees }: { brands: Option[]; licensees: Option[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createCampaignAction, {
    error: null,
  });

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Nome da campanha *</Label>
          <Input id="name" name="name" required placeholder="Volta às aulas 2026 — Liga Prime" />
        </div>
        <div>
          <Label htmlFor="campaignType">Tipo *</Label>
          <Select id="campaignType" name="campaignType" defaultValue="promocional">
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select id="status" name="status" defaultValue="planejamento">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="brandId">Marca</Label>
          <Select id="brandId" name="brandId" defaultValue="">
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
          <Select id="licenseeId" name="licenseeId" defaultValue="">
            <option value="">— (opcional)</option>
            {licensees.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="budget">Orçamento</Label>
          <Input id="budget" name="budget" type="number" min="0" step="0.01" placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="channel">Canal</Label>
          <Input id="channel" name="channel" placeholder="Digital, TV, PDV, OOH…" />
        </div>
        <div>
          <Label htmlFor="startDate">Início</Label>
          <Input id="startDate" name="startDate" type="date" />
        </div>
        <div>
          <Label htmlFor="endDate">Fim</Label>
          <Input id="endDate" name="endDate" type="date" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="goal">Objetivo</Label>
          <Input id="goal" name="goal" placeholder="Ex.: +15% de sell-out na categoria" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" name="notes" rows={3} placeholder="Escopo, público, peças…" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Criar campanha"}
        </Button>
        <Link href="/marketing">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
