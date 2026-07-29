"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { addDocumentAction, type SubState } from "./actions";
import { DOC_TYPE_OPTIONS } from "./doc-meta";

function useReset(ok: boolean | undefined) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (ok) ref.current?.reset();
  }, [ok]);
  return ref;
}

const cls = "h-9 text-sm";

export function DocumentForm({ supplierId }: { supplierId: string }) {
  const [state, action, pending] = useActionState<SubState, FormData>(
    addDocumentAction.bind(null, supplierId),
    { error: null },
  );
  const ref = useReset(state.ok);

  return (
    <form ref={ref} action={action} className="grid gap-2 sm:grid-cols-12">
      <Select name="docType" required defaultValue="" className={`${cls} sm:col-span-3`}>
        <option value="">Tipo *</option>
        {DOC_TYPE_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </Select>
      <Input name="name" placeholder="Descrição" className={`${cls} sm:col-span-4`} />
      <Input name="number" placeholder="Número" className={`${cls} sm:col-span-2`} />
      <Input name="responsible" placeholder="Responsável" className={`${cls} sm:col-span-3`} />

      <Input name="issuer" placeholder="Emissor" className={`${cls} sm:col-span-3`} />
      <Input name="issueDate" type="date" title="Emissão" className={`${cls} sm:col-span-2`} />
      <Input name="validUntil" type="date" title="Validade" className={`${cls} sm:col-span-2`} />
      <Input name="fileName" placeholder="Arquivo (ex.: contrato.pdf)" className={`${cls} sm:col-span-4`} />
      <Button type="submit" size="sm" disabled={pending} className="sm:col-span-1">
        <Plus size={13} />
      </Button>

      {state.error && <p className="text-xs text-red-600 sm:col-span-12">{state.error}</p>}
    </form>
  );
}
