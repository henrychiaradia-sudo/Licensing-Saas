"use client";

import { useActionState } from "react";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { createAgencyAction, type FormState } from "../actions";
import { AGENCY_TYPE_OPTIONS } from "../labels";

export function AgencyForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createAgencyAction, {
    error: null,
  });

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="ag-name">Nome *</Label>
        <Input id="ag-name" name="name" required placeholder="Agência Criativa X" />
      </div>
      <div>
        <Label htmlFor="ag-type">Tipo *</Label>
        <Select id="ag-type" name="agencyType" defaultValue="criacao">
          {AGENCY_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="ag-contact">Contato</Label>
        <Input id="ag-contact" name="contactName" placeholder="Nome do responsável" />
      </div>
      <div>
        <Label htmlFor="ag-email">E-mail</Label>
        <Input id="ag-email" name="email" type="email" placeholder="contato@agencia.com" />
      </div>
      <div>
        <Label htmlFor="ag-phone">Telefone</Label>
        <Input id="ag-phone" name="phone" placeholder="(11) 90000-0000" />
      </div>
      <div>
        <Label htmlFor="ag-notes">Observações</Label>
        <Textarea id="ag-notes" name="notes" rows={1} placeholder="Especialidade, contratos…" />
      </div>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Cadastrar agência"}
        </Button>
      </div>
    </form>
  );
}
