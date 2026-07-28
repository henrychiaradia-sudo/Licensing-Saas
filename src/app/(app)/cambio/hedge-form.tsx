"use client";

import { useActionState, useEffect, useRef } from "react";
import { ShieldCheck } from "lucide-react";
import { Button, Input, Label, Select } from "@/components/ui";
import { addHedgeAction, type FormState } from "./actions";

export function HedgeForm({ currencies }: { currencies: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(addHedgeAction, {
    error: null,
  });
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state.ok]);

  return (
    <form ref={ref} action={formAction} className="grid gap-3 sm:grid-cols-12 sm:items-end">
      <div className="sm:col-span-4">
        <Label htmlFor="h-cur">Moeda *</Label>
        <Select id="h-cur" name="currencyId" required defaultValue="">
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
      <div className="sm:col-span-4">
        <Label htmlFor="h-inst">Instrumento</Label>
        <Select id="h-inst" name="instrument" defaultValue="ndf">
          <option value="ndf">NDF</option>
          <option value="forward">Forward</option>
          <option value="swap">Swap</option>
          <option value="opcao">Opção</option>
        </Select>
      </div>
      <div className="sm:col-span-4">
        <Label htmlFor="h-side">Posição</Label>
        <Select id="h-side" name="side" defaultValue="compra">
          <option value="compra">Compra da moeda (importador)</option>
          <option value="venda">Venda da moeda (exportador)</option>
        </Select>
      </div>

      <div className="sm:col-span-3">
        <Label htmlFor="h-notional">Notional (moeda) *</Label>
        <Input id="h-notional" name="notional" type="number" step="0.01" min="0" required placeholder="1.000.000" />
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor="h-strike">Taxa contratada *</Label>
        <Input id="h-strike" name="strikeRate" type="number" step="0.000001" min="0" required placeholder="5,45" />
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor="h-trade">Data da operação *</Label>
        <Input id="h-trade" name="tradeDate" type="date" required />
      </div>
      <div className="sm:col-span-3">
        <Label htmlFor="h-mat">Vencimento *</Label>
        <Input id="h-mat" name="maturityDate" type="date" required />
      </div>

      <div className="sm:col-span-6">
        <Label htmlFor="h-cp">Contraparte</Label>
        <Input id="h-cp" name="counterparty" placeholder="Banco / mesa" />
      </div>
      <div className="sm:col-span-6">
        <Label htmlFor="h-notes">Observações</Label>
        <Input id="h-notes" name="notes" placeholder="Opcional" />
      </div>

      <div className="sm:col-span-12">
        <Button type="submit" disabled={pending}>
          <ShieldCheck size={14} /> {pending ? "Registrando…" : "Registrar hedge"}
        </Button>
      </div>
      {state.error && <p className="text-sm text-red-600 sm:col-span-12">{state.error}</p>}
    </form>
  );
}
