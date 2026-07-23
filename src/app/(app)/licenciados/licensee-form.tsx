"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select } from "@/components/ui";
import type { FormState } from "./actions";

type Option = { id: string; name: string };
type Initial = {
  legalName?: string;
  tradeName?: string | null;
  taxId?: string | null;
  countryId?: string | null;
  segmentId?: string | null;
  state?: string | null;
  city?: string | null;
  website?: string | null;
  status?: string;
  riskRating?: string | null;
  financialScore?: string | null;
};

export function LicenseeForm({
  action,
  initial,
  segments,
  countries,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initial?: Initial;
  segments: Option[];
  countries: Option[];
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="legalName">Razão social *</Label>
          <Input id="legalName" name="legalName" required defaultValue={initial?.legalName ?? ""} />
        </div>
        <div>
          <Label htmlFor="tradeName">Nome fantasia</Label>
          <Input id="tradeName" name="tradeName" defaultValue={initial?.tradeName ?? ""} />
        </div>
        <div>
          <Label htmlFor="taxId">CNPJ</Label>
          <Input id="taxId" name="taxId" defaultValue={initial?.taxId ?? ""} />
        </div>
        <div>
          <Label htmlFor="segmentId">Segmento</Label>
          <Select id="segmentId" name="segmentId" defaultValue={initial?.segmentId ?? ""}>
            <option value="">—</option>
            {segments.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="countryId">País</Label>
          <Select id="countryId" name="countryId" defaultValue={initial?.countryId ?? ""}>
            <option value="">—</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="state">Estado</Label>
          <Input id="state" name="state" defaultValue={initial?.state ?? ""} />
        </div>
        <div>
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" name="city" defaultValue={initial?.city ?? ""} />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input id="website" name="website" defaultValue={initial?.website ?? ""} />
        </div>
        <div>
          <Label htmlFor="financialScore">Score financeiro (0–1000)</Label>
          <Input
            id="financialScore"
            name="financialScore"
            type="number"
            min={0}
            max={1000}
            defaultValue={initial?.financialScore ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="riskRating">Classificação de risco</Label>
          <Select id="riskRating" name="riskRating" defaultValue={initial?.riskRating ?? ""}>
            <option value="">—</option>
            <option value="baixo">Baixo</option>
            <option value="medio">Médio</option>
            <option value="alto">Alto</option>
            <option value="critico">Crítico</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select id="status" name="status" defaultValue={initial?.status ?? "em_negociacao"}>
            <option value="em_negociacao">Em negociação</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="suspenso">Suspenso</option>
            <option value="encerrado">Encerrado</option>
          </Select>
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
        <Link href="/licenciados">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
