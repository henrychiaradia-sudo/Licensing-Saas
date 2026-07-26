"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select } from "@/components/ui";
import type { FormState } from "./actions";

type CountryOption = { id: string; label: string };

export type SupplierInitial = {
  code?: string;
  legalName?: string;
  tradeName?: string | null;
  category?: string;
  countryId?: string | null;
  city?: string | null;
  status?: string;
  rating?: number | string | null;
  leadTimeDays?: number | null;
  paymentTerms?: string | null;
  email?: string | null;
  phone?: string | null;
};

const CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "materia_prima", label: "Matéria-prima" },
  { value: "manufatura", label: "Manufatura" },
  { value: "embalagem", label: "Embalagem" },
  { value: "logistica", label: "Logística" },
  { value: "servicos", label: "Serviços" },
  { value: "marketing", label: "Marketing" },
  { value: "tecnologia", label: "Tecnologia" },
];
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "em_homologacao", label: "Em homologação" },
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "bloqueado", label: "Bloqueado" },
];

export function SupplierForm({
  action,
  countries,
  initial,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  countries: CountryOption[];
  initial?: SupplierInitial;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const rating = initial?.rating != null ? String(initial.rating) : "";

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="code">Código *</Label>
          <Input id="code" name="code" required placeholder="FORN-010" defaultValue={initial?.code ?? ""} />
        </div>
        <div>
          <Label htmlFor="legalName">Razão social *</Label>
          <Input id="legalName" name="legalName" required defaultValue={initial?.legalName ?? ""} />
        </div>
        <div>
          <Label htmlFor="tradeName">Nome fantasia</Label>
          <Input id="tradeName" name="tradeName" defaultValue={initial?.tradeName ?? ""} />
        </div>
        <div>
          <Label htmlFor="category">Categoria *</Label>
          <Select id="category" name="category" defaultValue={initial?.category ?? "manufatura"}>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="countryId">País</Label>
          <Select id="countryId" name="countryId" defaultValue={initial?.countryId ?? ""}>
            <option value="">— (opcional)</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" name="city" defaultValue={initial?.city ?? ""} />
        </div>
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select id="status" name="status" defaultValue={initial?.status ?? "em_homologacao"}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="rating">Avaliação (0–5)</Label>
          <Input
            id="rating"
            name="rating"
            type="number"
            step="0.1"
            min="0"
            max="5"
            placeholder="4,5"
            defaultValue={rating}
          />
        </div>
        <div>
          <Label htmlFor="leadTimeDays">Lead time (dias)</Label>
          <Input
            id="leadTimeDays"
            name="leadTimeDays"
            type="number"
            min="0"
            step="1"
            placeholder="30"
            defaultValue={initial?.leadTimeDays ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="paymentTerms">Condição de pagamento</Label>
          <Input id="paymentTerms" name="paymentTerms" placeholder="30 dias" defaultValue={initial?.paymentTerms ?? ""} />
        </div>
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} />
        </div>
        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" name="phone" defaultValue={initial?.phone ?? ""} />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar fornecedor"}
        </Button>
        <Link href="/fornecedores">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
