"use client";

import { useActionState } from "react";
import { FilePlus } from "lucide-react";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { addAmendmentAction } from "../actions";

const TYPES = [
  { value: "aditivo", label: "Aditivo" },
  { value: "prorrogacao", label: "Prorrogação" },
  { value: "reajuste", label: "Reajuste" },
  { value: "rescisao", label: "Rescisão" },
  { value: "outro", label: "Outro" },
];

export function AmendmentForm({ contractId }: { contractId: string }) {
  const action = addAmendmentAction.bind(null, contractId);
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <div>
        <Label htmlFor="amendmentType">Tipo *</Label>
        <Select id="amendmentType" name="amendmentType" defaultValue="aditivo">
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="effectiveDate">Vigência do aditivo</Label>
        <Input id="effectiveDate" name="effectiveDate" type="date" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="newEndDate">Nova data de fim (prorrogação)</Label>
        <Input id="newEndDate" name="newEndDate" type="date" />
        <p className="mt-1 text-xs text-neutral-400">
          Se preenchida, estende a vigência do contrato. Rescisão encerra o contrato.
        </p>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" placeholder="Objeto do aditivo…" />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          <FilePlus size={15} /> {pending ? "Registrando…" : "Registrar aditivo"}
        </Button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
