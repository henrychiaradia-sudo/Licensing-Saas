"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select } from "@/components/ui";
import type { FormState } from "./actions";
import { SUPPLIER_TYPE_OPTIONS, SUPPLIER_STATUS_OPTIONS } from "./supplier-meta";

type CountryOption = { id: string; label: string };

export type SupplierInitial = {
  code?: string;
  legalName?: string;
  tradeName?: string | null;
  supplierType?: string | null;
  economicGroup?: string | null;
  cnpj?: string | null;
  stateRegistration?: string | null;
  category?: string;
  countryId?: string | null;
  stateProvince?: string | null;
  city?: string | null;
  address?: string | null;
  website?: string | null;
  capacity?: string | null;
  moq?: number | null;
  incoterms?: string | null;
  currencies?: string | null;
  status?: string;
  rating?: number | string | null;
  leadTimeDays?: number | null;
  paymentTerms?: string | null;
  email?: string | null;
  phone?: string | null;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{title}</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </div>
  );
}

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
    <form action={formAction} className="grid max-w-4xl gap-6">
      <input type="hidden" name="category" value={initial?.category ?? "manufatura"} />

      <Section title="Identificação">
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
          <Label htmlFor="supplierType">Tipo</Label>
          <Select id="supplierType" name="supplierType" defaultValue={initial?.supplierType ?? ""}>
            <option value="">— selecione</option>
            {SUPPLIER_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="economicGroup">Grupo econômico</Label>
          <Input id="economicGroup" name="economicGroup" defaultValue={initial?.economicGroup ?? ""} />
        </div>
        <div>
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input id="cnpj" name="cnpj" placeholder="00.000.000/0001-00" defaultValue={initial?.cnpj ?? ""} />
        </div>
        <div>
          <Label htmlFor="stateRegistration">Inscrição estadual</Label>
          <Input id="stateRegistration" name="stateRegistration" defaultValue={initial?.stateRegistration ?? ""} />
        </div>
      </Section>

      <Section title="Localização">
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
          <Label htmlFor="stateProvince">Estado</Label>
          <Input id="stateProvince" name="stateProvince" placeholder="SP" defaultValue={initial?.stateProvince ?? ""} />
        </div>
        <div>
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" name="city" defaultValue={initial?.city ?? ""} />
        </div>
        <div className="lg:col-span-2">
          <Label htmlFor="address">Endereço</Label>
          <Input id="address" name="address" defaultValue={initial?.address ?? ""} />
        </div>
        <div>
          <Label htmlFor="website">Site</Label>
          <Input id="website" name="website" placeholder="https://" defaultValue={initial?.website ?? ""} />
        </div>
      </Section>

      <Section title="Condições comerciais">
        <div>
          <Label htmlFor="currencies">Moedas</Label>
          <Input id="currencies" name="currencies" placeholder="BRL, USD" defaultValue={initial?.currencies ?? ""} />
        </div>
        <div>
          <Label htmlFor="paymentTerms">Condição de pagamento</Label>
          <Input id="paymentTerms" name="paymentTerms" placeholder="30/60 dias" defaultValue={initial?.paymentTerms ?? ""} />
        </div>
        <div>
          <Label htmlFor="incoterms">Incoterms</Label>
          <Input id="incoterms" name="incoterms" placeholder="FOB, CIF" defaultValue={initial?.incoterms ?? ""} />
        </div>
        <div>
          <Label htmlFor="capacity">Capacidade produtiva</Label>
          <Input id="capacity" name="capacity" placeholder="50.000 pç/mês" defaultValue={initial?.capacity ?? ""} />
        </div>
        <div>
          <Label htmlFor="leadTimeDays">Lead time (dias)</Label>
          <Input id="leadTimeDays" name="leadTimeDays" type="number" min="0" step="1" placeholder="30" defaultValue={initial?.leadTimeDays ?? ""} />
        </div>
        <div>
          <Label htmlFor="moq">MOQ (mínimo)</Label>
          <Input id="moq" name="moq" type="number" min="0" step="1" placeholder="500" defaultValue={initial?.moq ?? ""} />
        </div>
      </Section>

      <Section title="Contato & situação">
        <div>
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} />
        </div>
        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" name="phone" defaultValue={initial?.phone ?? ""} />
        </div>
        <div>
          <Label htmlFor="rating">Avaliação (0–5)</Label>
          <Input id="rating" name="rating" type="number" step="0.1" min="0" max="5" placeholder="4,5" defaultValue={rating} />
        </div>
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select id="status" name="status" defaultValue={initial?.status ?? "prospect"}>
            {SUPPLIER_STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
      </Section>

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
