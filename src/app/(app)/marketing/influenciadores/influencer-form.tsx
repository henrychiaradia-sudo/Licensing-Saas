"use client";

import { useActionState } from "react";
import { Button, Input, Label, Textarea } from "@/components/ui";
import { createInfluencerAction, type FormState } from "../actions";

export function InfluencerForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createInfluencerAction, {
    error: null,
  });

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div>
        <Label htmlFor="inf-name">Nome *</Label>
        <Input id="inf-name" name="name" required placeholder="Ana Esportes" />
      </div>
      <div>
        <Label htmlFor="inf-handle">@handle</Label>
        <Input id="inf-handle" name="handle" placeholder="@anaesportes" />
      </div>
      <div>
        <Label htmlFor="inf-platform">Plataforma</Label>
        <Input id="inf-platform" name="platform" placeholder="Instagram, TikTok, YouTube…" />
      </div>
      <div>
        <Label htmlFor="inf-segment">Segmento</Label>
        <Input id="inf-segment" name="segment" placeholder="Fitness, moda, games…" />
      </div>
      <div>
        <Label htmlFor="inf-followers">Seguidores</Label>
        <Input id="inf-followers" name="followers" type="number" min="0" step="1" placeholder="0" />
      </div>
      <div>
        <Label htmlFor="inf-fee">Cachê médio (R$)</Label>
        <Input id="inf-fee" name="fee" type="number" min="0" step="0.01" placeholder="0,00" />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="inf-notes">Observações</Label>
        <Textarea id="inf-notes" name="notes" rows={1} placeholder="Histórico, engajamento…" />
      </div>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Cadastrar influenciador"}
        </Button>
      </div>
    </form>
  );
}
