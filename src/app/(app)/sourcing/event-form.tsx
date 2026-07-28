"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { FileSearch, FileText, Receipt } from "lucide-react";
import { Button, Input, Label, Select, Textarea } from "@/components/ui";
import { cn } from "@/lib/utils";
import { createSourcingEventAction } from "./actions";

type ProcessType = "rfi" | "rfp" | "rfq";

const TYPES: {
  value: ProcessType;
  name: string;
  desc: string;
  icon: typeof FileSearch;
}[] = [
  {
    value: "rfi",
    name: "RFI",
    desc: "Request for Information — pré-qualificação e análise técnica de fornecedores",
    icon: FileSearch,
  },
  {
    value: "rfp",
    name: "RFP",
    desc: "Request for Proposal — projetos e soluções com escopo e entrega",
    icon: FileText,
  },
  {
    value: "rfq",
    name: "RFQ",
    desc: "Request for Quotation — cotação de preços para itens definidos",
    icon: Receipt,
  },
];

const TITLE_PLACEHOLDER: Record<ProcessType, string> = {
  rfi: "Ex.: Pré-qualificação de confecções têxteis 2026",
  rfp: "Ex.: Plataforma de e-commerce para licenciados",
  rfq: "Ex.: Camisetas oficiais — coleção 2026",
};

export function EventForm({ categories }: { categories: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(createSourcingEventAction, { error: null });
  const [type, setType] = useState<ProcessType>("rfq");

  return (
    <form action={formAction} className="grid max-w-2xl gap-5">
      <div>
        <Label>Tipo de processo *</Label>
        <input type="hidden" name="processType" value={type} />
        <div className="grid gap-2 sm:grid-cols-3">
          {TYPES.map((t) => {
            const active = type === t.value;
            const Icon = t.icon;
            return (
              <button
                type="button"
                key={t.value}
                onClick={() => setType(t.value)}
                className={cn(
                  "flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors",
                  active
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500 dark:bg-blue-950/40"
                    : "border-neutral-200 hover:border-blue-300 dark:border-neutral-700",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Icon size={16} className={active ? "text-blue-600" : "text-neutral-400"} />
                  {t.name}
                </span>
                <span className="text-[11px] leading-snug text-neutral-500">{t.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Label htmlFor="title">Título do processo *</Label>
        <Input id="title" name="title" required placeholder={TITLE_PLACEHOLDER[type]} />
      </div>

      <div>
        <Label htmlFor="objective">Objetivo</Label>
        <Textarea
          id="objective"
          name="objective"
          rows={2}
          placeholder="O que este processo busca alcançar (ex.: reduzir custo em 12% mantendo o padrão de qualidade)."
        />
      </div>

      <div>
        <Label htmlFor="scope">
          {type === "rfi" ? "Escopo / Questionário técnico" : type === "rfp" ? "Escopo do projeto" : "Escopo / Especificação"}
        </Label>
        <Textarea
          id="scope"
          name="scope"
          rows={4}
          placeholder={
            type === "rfi"
              ? "Itens de qualificação: capacidade instalada, certificações, referências, compliance…"
              : type === "rfp"
                ? "Entregáveis, marcos, requisitos funcionais e critérios de aceite…"
                : "Especificação técnica, quantidades, prazos e condições comerciais…"
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="categoryId">Categoria</Label>
          <Select id="categoryId" name="categoryId" defaultValue="">
            <option value="">— (opcional)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="dueDate">Prazo para propostas</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
      </div>

      <div>
        <Label htmlFor="baselineAmount">Orçamento base (baseline)</Label>
        <Input
          id="baselineAmount"
          name="baselineAmount"
          type="number"
          min="0"
          step="0.01"
          placeholder="Ex.: 100000"
        />
        <p className="mt-1 text-xs text-neutral-400">
          Valor de referência antes da negociação. Usado para calcular o savings ao adjudicar.
        </p>
      </div>
      <input type="hidden" name="status" value="aberto" />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Criando…" : `Criar ${type.toUpperCase()}`}
        </Button>
        <Link href="/sourcing">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
