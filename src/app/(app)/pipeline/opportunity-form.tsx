"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { createOpportunityAction, type FormState } from "./actions";

type Option = { id: string; label: string };

const STAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "prospeccao", label: "Prospecção" },
  { value: "qualificacao", label: "Qualificação" },
  { value: "proposta", label: "Proposta" },
  { value: "negociacao", label: "Negociação" },
];

export function OpportunityForm({
  brands,
  segments,
  owners,
}: {
  brands: Option[];
  segments: Option[];
  owners: Option[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createOpportunityAction,
    { error: null },
  );

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Oportunidade *</Label>
          <Input id="name" name="name" required placeholder="Linha de vestuário — Marca Liga Prime" />
        </div>
        <div>
          <Label htmlFor="companyName">Empresa (prospect)</Label>
          <Input id="companyName" name="companyName" placeholder="Nova Confecções Ltda" />
        </div>
        <div>
          <Label htmlFor="stage">Estágio *</Label>
          <Select id="stage" name="stage" defaultValue="prospeccao">
            {STAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="brandId">Marca-alvo</Label>
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
          <Label htmlFor="segmentId">Segmento</Label>
          <Select id="segmentId" name="segmentId" defaultValue="">
            <option value="">— (opcional)</option>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="estimatedValue">Valor estimado (royalty/ano)</Label>
          <Input id="estimatedValue" name="estimatedValue" type="number" min="0" step="0.01" placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="expectedCloseDate">Previsão de fechamento</Label>
          <Input id="expectedCloseDate" name="expectedCloseDate" type="date" />
        </div>
        <div>
          <Label htmlFor="source">Origem</Label>
          <Input id="source" name="source" placeholder="Evento, indicação, inbound…" />
        </div>
        <div>
          <Label htmlFor="ownerUserId">Responsável</Label>
          <Select id="ownerUserId" name="ownerUserId" defaultValue="">
            <option value="">— (eu)</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="contactName">Contato</Label>
          <Input id="contactName" name="contactName" placeholder="Nome" />
        </div>
        <div>
          <Label htmlFor="contactEmail">E-mail</Label>
          <Input id="contactEmail" name="contactEmail" placeholder="email@empresa.com" />
        </div>
        <div>
          <Label htmlFor="contactPhone">Telefone</Label>
          <Input id="contactPhone" name="contactPhone" placeholder="(11) 90000-0000" />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" rows={3} placeholder="Contexto, potencial, próximos passos…" />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Criar oportunidade"}
        </Button>
        <Link href="/pipeline">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
