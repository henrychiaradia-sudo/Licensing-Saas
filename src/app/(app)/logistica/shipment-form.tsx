"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { createShipmentAction, type FormState } from "./actions";

type PoOption = { id: string; label: string };

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "preparacao", label: "Preparação" },
  { value: "em_transito", label: "Em trânsito" },
  { value: "desembaraco", label: "Desembaraço aduaneiro" },
  { value: "entregue", label: "Entregue" },
  { value: "atrasado", label: "Atrasado" },
];

export function ShipmentForm({ pos }: { pos: PoOption[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createShipmentAction, {
    error: null,
  });

  return (
    <form action={formAction} className="grid max-w-3xl gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="purchaseOrderId">Pedido de compra vinculado</Label>
          <Select id="purchaseOrderId" name="purchaseOrderId" defaultValue="">
            <option value="">— (opcional; herda o fornecedor do pedido)</option>
            {pos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="carrier">Transportadora</Label>
          <Input id="carrier" name="carrier" placeholder="Maersk, DHL, LogiFast…" />
        </div>
        <div>
          <Label htmlFor="trackingCode">Código de rastreio</Label>
          <Input id="trackingCode" name="trackingCode" placeholder="MRKU1234567" />
        </div>
        <div>
          <Label htmlFor="status">Status inicial *</Label>
          <Select id="status" name="status" defaultValue="preparacao">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="incoterm">Incoterm</Label>
          <Input id="incoterm" name="incoterm" placeholder="FOB, CIF, DDP…" />
        </div>
        <div>
          <Label htmlFor="origin">Origem</Label>
          <Input id="origin" name="origin" placeholder="Shenzhen, CN" />
        </div>
        <div>
          <Label htmlFor="destination">Destino</Label>
          <Input id="destination" name="destination" placeholder="Santos, BR" />
        </div>
        <div>
          <Label htmlFor="dispatchedAt">Embarcado em</Label>
          <Input id="dispatchedAt" name="dispatchedAt" type="date" />
        </div>
        <div>
          <Label htmlFor="eta">Previsão de chegada (ETA)</Label>
          <Input id="eta" name="eta" type="date" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Observações</Label>
          <Textarea id="notes" name="notes" rows={2} placeholder="Container, volumes, notas de despacho…" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Registrar embarque"}
        </Button>
        <Link href="/logistica">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
