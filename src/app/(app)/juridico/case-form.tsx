"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { createLegalCaseAction, type FormState } from "./actions";

type Option = { id: string; label: string };

const TYPE_OPTIONS = [
  { value: "contencioso", label: "Contencioso" },
  { value: "consultivo", label: "Consultivo" },
  { value: "contratual", label: "Contratual" },
  { value: "propriedade_intelectual", label: "Propriedade intelectual" },
  { value: "trabalhista", label: "Trabalhista" },
  { value: "tributario", label: "Tributário" },
];
const STATUS_OPTIONS = [
  { value: "aberto", label: "Aberto" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "suspenso", label: "Suspenso" },
];
const PRIORITY_OPTIONS = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
];

export function CaseForm({ brands, licensees }: { brands: Option[]; licensees: Option[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createLegalCaseAction, {
    error: null,
  });

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="title">Título do caso *</Label>
          <Input id="title" name="title" required placeholder="Uso indevido da marca Liga Prime em marketplace" />
        </div>
        <div>
          <Label htmlFor="caseType">Tipo *</Label>
          <Select id="caseType" name="caseType" defaultValue="contencioso">
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="priority">Prioridade *</Label>
          <Select id="priority" name="priority" defaultValue="media">
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select id="status" name="status" defaultValue="aberto">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="counterparty">Contraparte</Label>
          <Input id="counterparty" name="counterparty" placeholder="Empresa / pessoa envolvida" />
        </div>
        <div>
          <Label htmlFor="brandId">Marca relacionada</Label>
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
          <Label htmlFor="licenseeId">Licenciado relacionado</Label>
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
          <Label htmlFor="amountAtRisk">Valor em risco (R$)</Label>
          <Input id="amountAtRisk" name="amountAtRisk" type="number" min="0" step="0.01" placeholder="0,00" />
        </div>
        <div>
          <Label htmlFor="responsible">Responsável</Label>
          <Input id="responsible" name="responsible" placeholder="Advogado / escritório" />
        </div>
        <div>
          <Label htmlFor="forum">Foro / instância</Label>
          <Input id="forum" name="forum" placeholder="Ex.: 2ª Vara Cível de SP / INPI" />
        </div>
        <div>
          <Label htmlFor="openedAt">Abertura</Label>
          <Input id="openedAt" name="openedAt" type="date" />
        </div>
        <div>
          <Label htmlFor="dueDate">Próximo prazo</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea id="description" name="description" rows={3} placeholder="Resumo do caso, pedido, contexto…" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Observações internas</Label>
          <Textarea id="notes" name="notes" rows={2} placeholder="Estratégia, notas do time jurídico…" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Abrir caso"}
        </Button>
        <Link href="/juridico">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
