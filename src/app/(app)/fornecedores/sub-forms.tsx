"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import {
  addContactAction,
  addBankAction,
  addPlantAction,
  addCertAction,
  addAuditAction,
  type SubState,
} from "./actions";

function useReset(ok: boolean | undefined) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (ok) ref.current?.reset();
  }, [ok]);
  return ref;
}

const cls = "h-9 text-sm";

export function ContactForm({ supplierId }: { supplierId: string }) {
  const [state, action, pending] = useActionState<SubState, FormData>(
    addContactAction.bind(null, supplierId),
    { error: null },
  );
  const ref = useReset(state.ok);
  return (
    <form ref={ref} action={action} className="grid gap-2 sm:grid-cols-12 sm:items-center">
      <Input name="name" required placeholder="Nome *" className={`${cls} sm:col-span-3`} />
      <Input name="role" placeholder="Cargo" className={`${cls} sm:col-span-2`} />
      <Input name="email" placeholder="E-mail" className={`${cls} sm:col-span-3`} />
      <Input name="phone" placeholder="Telefone" className={`${cls} sm:col-span-2`} />
      <label className="flex items-center gap-1.5 text-xs text-neutral-500 sm:col-span-1">
        <input type="checkbox" name="isPrimary" value="1" /> Princ.
      </label>
      <Button type="submit" size="sm" disabled={pending} className="sm:col-span-1">
        <Plus size={13} />
      </Button>
      {state.error && <p className="text-xs text-red-600 sm:col-span-12">{state.error}</p>}
    </form>
  );
}

export function BankForm({ supplierId }: { supplierId: string }) {
  const [state, action, pending] = useActionState<SubState, FormData>(
    addBankAction.bind(null, supplierId),
    { error: null },
  );
  const ref = useReset(state.ok);
  return (
    <form ref={ref} action={action} className="grid gap-2 sm:grid-cols-12 sm:items-center">
      <Input name="bankName" required placeholder="Banco *" className={`${cls} sm:col-span-3`} />
      <Input name="agency" placeholder="Agência" className={`${cls} sm:col-span-2`} />
      <Input name="accountNumber" placeholder="Conta" className={`${cls} sm:col-span-2`} />
      <Input name="pixKey" placeholder="PIX / SWIFT" className={`${cls} sm:col-span-3`} />
      <Select name="currency" defaultValue="BRL" className={`${cls} sm:col-span-1`}>
        <option value="BRL">BRL</option>
        <option value="USD">USD</option>
        <option value="EUR">EUR</option>
        <option value="CNY">CNY</option>
      </Select>
      <Button type="submit" size="sm" disabled={pending} className="sm:col-span-1">
        <Plus size={13} />
      </Button>
      {state.error && <p className="text-xs text-red-600 sm:col-span-12">{state.error}</p>}
    </form>
  );
}

export function PlantForm({ supplierId }: { supplierId: string }) {
  const [state, action, pending] = useActionState<SubState, FormData>(
    addPlantAction.bind(null, supplierId),
    { error: null },
  );
  const ref = useReset(state.ok);
  return (
    <form ref={ref} action={action} className="grid gap-2 sm:grid-cols-12 sm:items-center">
      <Input name="name" required placeholder="Planta / unidade *" className={`${cls} sm:col-span-3`} />
      <Input name="country" placeholder="País" className={`${cls} sm:col-span-2`} />
      <Input name="city" placeholder="Cidade" className={`${cls} sm:col-span-2`} />
      <Input name="capacity" placeholder="Capacidade" className={`${cls} sm:col-span-2`} />
      <Input name="certifications" placeholder="Certificações" className={`${cls} sm:col-span-2`} />
      <Button type="submit" size="sm" disabled={pending} className="sm:col-span-1">
        <Plus size={13} />
      </Button>
      {state.error && <p className="text-xs text-red-600 sm:col-span-12">{state.error}</p>}
    </form>
  );
}

export function CertForm({ supplierId }: { supplierId: string }) {
  const [state, action, pending] = useActionState<SubState, FormData>(
    addCertAction.bind(null, supplierId),
    { error: null },
  );
  const ref = useReset(state.ok);
  return (
    <form ref={ref} action={action} className="grid gap-2 sm:grid-cols-12 sm:items-center">
      <Input name="name" required placeholder="Certificação *" className={`${cls} sm:col-span-3`} />
      <Input name="number" placeholder="Número" className={`${cls} sm:col-span-2`} />
      <Input name="issuer" placeholder="Emissor" className={`${cls} sm:col-span-2`} />
      <Input name="issueDate" type="date" title="Emissão" className={`${cls} sm:col-span-2`} />
      <Input name="validUntil" type="date" title="Validade" className={`${cls} sm:col-span-2`} />
      <Button type="submit" size="sm" disabled={pending} className="sm:col-span-1">
        <Plus size={13} />
      </Button>
      {state.error && <p className="text-xs text-red-600 sm:col-span-12">{state.error}</p>}
    </form>
  );
}

export function AuditForm({ supplierId }: { supplierId: string }) {
  const [state, action, pending] = useActionState<SubState, FormData>(
    addAuditAction.bind(null, supplierId),
    { error: null },
  );
  const ref = useReset(state.ok);
  return (
    <form ref={ref} action={action} className="grid gap-2 sm:grid-cols-12 sm:items-center">
      <Input name="auditDate" type="date" title="Data" className={`${cls} sm:col-span-2`} />
      <Input name="auditType" placeholder="Tipo (social, qualidade…)" className={`${cls} sm:col-span-3`} />
      <Select name="result" defaultValue="aprovado" className={`${cls} sm:col-span-2`}>
        <option value="aprovado">Aprovado</option>
        <option value="condicional">Condicional</option>
        <option value="reprovado">Reprovado</option>
      </Select>
      <Input name="score" type="number" min="0" max="100" placeholder="Score" className={`${cls} sm:col-span-1`} />
      <Input name="auditor" placeholder="Auditor" className={`${cls} sm:col-span-3`} />
      <Button type="submit" size="sm" disabled={pending} className="sm:col-span-1">
        <Plus size={13} />
      </Button>
      {state.error && <p className="text-xs text-red-600 sm:col-span-12">{state.error}</p>}
    </form>
  );
}
