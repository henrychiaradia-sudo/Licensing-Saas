"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { createInspectionAction, type FormState } from "./actions";

type SupplierOption = { id: string; label: string };

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "recebimento", label: "Recebimento" },
  { value: "producao", label: "Produção" },
  { value: "auditoria", label: "Auditoria de fornecedor" },
  { value: "outro", label: "Outro" },
];

const RESULT_OPTIONS: { value: string; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "aprovado", label: "Aprovado" },
  { value: "aprovado_condicional", label: "Aprovado com ressalvas" },
  { value: "reprovado", label: "Reprovado" },
];

export function InspectionForm({ suppliers }: { suppliers: SupplierOption[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createInspectionAction,
    { error: null },
  );

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="title">Título da inspeção *</Label>
          <Input
            id="title"
            name="title"
            required
            placeholder="Inspeção de recebimento — Lote 2451 camisetas"
          />
        </div>
        <div>
          <Label htmlFor="inspectionType">Tipo *</Label>
          <Select id="inspectionType" name="inspectionType" defaultValue="recebimento">
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="supplierId">Fornecedor</Label>
          <Select id="supplierId" name="supplierId" defaultValue="">
            <option value="">— (opcional)</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="sampleSize">Tamanho da amostra</Label>
          <Input id="sampleSize" name="sampleSize" type="number" min="0" step="1" placeholder="100" defaultValue="0" />
        </div>
        <div>
          <Label htmlFor="defectsFound">Defeitos encontrados</Label>
          <Input id="defectsFound" name="defectsFound" type="number" min="0" step="1" placeholder="0" defaultValue="0" />
        </div>
        <div>
          <Label htmlFor="result">Resultado *</Label>
          <Select id="result" name="result" defaultValue="pendente">
            {RESULT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="inspectedAt">Data da inspeção</Label>
          <Input id="inspectedAt" name="inspectedAt" type="date" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" name="notes" rows={3} placeholder="Critérios avaliados, ressalvas, referências de norma…" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Registrar inspeção"}
        </Button>
        <Link href="/qualidade">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
