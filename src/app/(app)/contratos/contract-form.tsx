"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import type { FormState } from "./actions";

type Option = { id: string; label: string };
type BrandOption = { id: string; name: string; code: string };

export type ContractInitial = {
  contractNumber?: string;
  licenseeId?: string;
  currencyId?: string;
  status?: string;
  exclusivity?: string;
  signingDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  autoRenewal?: boolean;
  renewalTermMonths?: number | null;
  minimumGuaranteeTotal?: number | string | null;
  insuranceRequired?: boolean;
  insuranceInfo?: string | null;
  notes?: string | null;
  responsibleName?: string | null;
  responsibleEmail?: string | null;
  responsiblePhone?: string | null;
  brandIds?: string[];
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "rascunho", label: "Rascunho" },
  { value: "em_aprovacao", label: "Em aprovação" },
  { value: "vigente", label: "Vigente" },
  { value: "suspenso", label: "Suspenso" },
  { value: "renovado", label: "Renovado" },
  { value: "expirado", label: "Expirado" },
  { value: "encerrado", label: "Encerrado" },
];

export function ContractForm({
  action,
  licensees,
  currencies,
  brands,
  initial,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  licensees: Option[];
  currencies: Option[];
  brands: BrandOption[];
  initial?: ContractInitial;
}) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const selectedBrands = new Set(initial?.brandIds ?? []);
  const mg =
    initial?.minimumGuaranteeTotal != null ? String(initial.minimumGuaranteeTotal) : "";

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="contractNumber">Número do contrato *</Label>
          <Input
            id="contractNumber"
            name="contractNumber"
            required
            placeholder="CT-2026-001"
            defaultValue={initial?.contractNumber ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="licenseeId">Licenciado *</Label>
          <Select id="licenseeId" name="licenseeId" defaultValue={initial?.licenseeId ?? ""} required>
            <option value="" disabled>
              Selecione…
            </option>
            {licensees.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select id="status" name="status" defaultValue={initial?.status ?? "rascunho"}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="exclusivity">Exclusividade *</Label>
          <Select
            id="exclusivity"
            name="exclusivity"
            defaultValue={initial?.exclusivity ?? "nao_exclusivo"}
          >
            <option value="nao_exclusivo">Não exclusivo</option>
            <option value="exclusivo">Exclusivo</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="currencyId">Moeda *</Label>
          <Select id="currencyId" name="currencyId" defaultValue={initial?.currencyId ?? ""} required>
            <option value="" disabled>
              Selecione…
            </option>
            {currencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="minimumGuaranteeTotal">Garantia mínima total</Label>
          <Input
            id="minimumGuaranteeTotal"
            name="minimumGuaranteeTotal"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            defaultValue={mg}
          />
        </div>
        <div>
          <Label htmlFor="signingDate">Assinatura</Label>
          <Input id="signingDate" name="signingDate" type="date" defaultValue={initial?.signingDate ?? ""} />
        </div>
        <div>
          <Label htmlFor="startDate">Início da vigência</Label>
          <Input id="startDate" name="startDate" type="date" defaultValue={initial?.startDate ?? ""} />
        </div>
        <div>
          <Label htmlFor="endDate">Fim da vigência</Label>
          <Input id="endDate" name="endDate" type="date" defaultValue={initial?.endDate ?? ""} />
        </div>
        <div>
          <Label htmlFor="renewalTermMonths">Prazo de renovação (meses)</Label>
          <Input
            id="renewalTermMonths"
            name="renewalTermMonths"
            type="number"
            min="0"
            step="1"
            placeholder="12"
            defaultValue={initial?.renewalTermMonths ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="autoRenewal"
            defaultChecked={initial?.autoRenewal ?? false}
            className="h-4 w-4 rounded border-neutral-300"
          />
          Renovação automática
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="insuranceRequired"
            defaultChecked={initial?.insuranceRequired ?? false}
            className="h-4 w-4 rounded border-neutral-300"
          />
          Seguro exigido
        </label>
      </div>

      <div>
        <Label htmlFor="insuranceInfo">Informações de seguro</Label>
        <Input id="insuranceInfo" name="insuranceInfo" defaultValue={initial?.insuranceInfo ?? ""} />
      </div>

      <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
        <p className="mb-3 text-sm font-semibold">Responsável pelo contrato</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="responsibleName">Nome</Label>
            <Input
              id="responsibleName"
              name="responsibleName"
              placeholder="Ex.: Maria Souza"
              defaultValue={initial?.responsibleName ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="responsibleEmail">E-mail</Label>
            <Input
              id="responsibleEmail"
              name="responsibleEmail"
              type="email"
              placeholder="nome@empresa.com.br"
              defaultValue={initial?.responsibleEmail ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="responsiblePhone">Telefone</Label>
            <Input
              id="responsiblePhone"
              name="responsiblePhone"
              placeholder="+55 11 90000-0000"
              defaultValue={initial?.responsiblePhone ?? ""}
            />
          </div>
        </div>
      </div>

      <div>
        <Label>Marcas licenciadas neste contrato</Label>
        {brands.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma marca cadastrada.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {brands.map((b) => (
              <label
                key={b.id}
                className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700"
              >
                <input
                  type="checkbox"
                  name="brandIds"
                  value={b.id}
                  defaultChecked={selectedBrands.has(b.id)}
                  className="h-4 w-4 rounded border-neutral-300"
                />
                <span className="font-medium">{b.name}</span>
                <span className="text-xs text-neutral-400">{b.code}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar contrato"}
        </Button>
        <Link href="/contratos">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
