"use client";

import { useActionState } from "react";
import { ShoppingCart } from "lucide-react";
import { Button, Select, Label } from "@/components/ui";
import { convertRequisitionAction } from "./actions";

type Option = { id: string; label: string };

export function ConvertForm({
  reqId,
  suppliers,
  currencies,
}: {
  reqId: string;
  suppliers: Option[];
  currencies: Option[];
}) {
  const action = convertRequisitionAction.bind(null, reqId);
  const [state, formAction, pending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="min-w-[220px]">
        <Label htmlFor="c-supplier">Fornecedor *</Label>
        <Select id="c-supplier" name="supplierId" required defaultValue={suppliers[0]?.id ?? ""}>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="min-w-[160px]">
        <Label htmlFor="c-currency">Moeda *</Label>
        <Select id="c-currency" name="currencyId" required defaultValue={currencies[0]?.id ?? ""}>
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        <ShoppingCart size={15} /> {pending ? "Gerando…" : "Gerar pedido de compra"}
      </Button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
