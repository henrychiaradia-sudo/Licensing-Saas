"use client";

import { useActionState, useState } from "react";
import { createTaskAction, type FormState } from "./actions";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";

const PRIORITY_OPTIONS = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];
const STATUS_OPTIONS = [
  { value: "a_fazer", label: "A fazer" },
  { value: "em_andamento", label: "Em andamento" },
];

type BrandOpt = { id: string; name: string };
type LicenseeOpt = { id: string; legalName: string };

export function TaskForm({
  brands,
  licensees,
}: {
  brands: BrandOpt[];
  licensees: LicenseeOpt[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createTaskAction, {
    error: null,
  });
  const [kind, setKind] = useState<"marca" | "licenciado">("marca");

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Label htmlFor="title">Tarefa *</Label>
          <Input id="title" name="title" required placeholder="Revisar minuta do contrato CT-2026-777" />
        </div>
        <div>
          <Label htmlFor="assignee">Responsável</Label>
          <Input id="assignee" name="assignee" placeholder="Nome / time" />
        </div>
        <div>
          <Label htmlFor="dueDate">Prazo</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
        <div>
          <Label htmlFor="priority">Prioridade</Label>
          <Select id="priority" name="priority" defaultValue="media">
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status inicial</Label>
          <Select id="status" name="status" defaultValue="a_fazer">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="entityType">Vínculo *</Label>
          <Select
            id="entityType"
            name="entityType"
            value={kind}
            onChange={(e) => setKind(e.target.value as "marca" | "licenciado")}
          >
            <option value="marca">Marca</option>
            <option value="licenciado">Licenciado / Empresa</option>
          </Select>
        </div>
        <div>
          {kind === "marca" ? (
            <>
              <Label htmlFor="brandId">Marca *</Label>
              <Select id="brandId" name="brandId" defaultValue="" required>
                <option value="" disabled>
                  Selecione a marca…
                </option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </>
          ) : (
            <>
              <Label htmlFor="licenseeId">Licenciado / Empresa *</Label>
              <Select id="licenseeId" name="licenseeId" defaultValue="" required>
                <option value="" disabled>
                  Selecione o licenciado…
                </option>
                {licensees.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.legalName}
                  </option>
                ))}
              </Select>
            </>
          )}
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <Label htmlFor="description">Detalhes</Label>
          <Textarea id="description" name="description" rows={2} placeholder="Contexto ou checklist da tarefa…" />
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Adicionar tarefa"}
        </Button>
      </div>
    </form>
  );
}
