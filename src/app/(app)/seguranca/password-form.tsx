"use client";

import { useActionState, useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { changePasswordAction, type FormState } from "./actions";

/** Força relativa (0–4) — espelha src/lib/security.ts para uso no cliente. */
function strength(pw: string): number {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

const LABELS = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"];
const COLORS = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"];

export function PasswordForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changePasswordAction, {
    error: null,
  });
  const [pw, setPw] = useState("");
  const s = strength(pw);

  return (
    <form action={formAction} className="grid max-w-md gap-4">
      <div>
        <Label htmlFor="current">Senha atual</Label>
        <Input id="current" name="current" type="password" required autoComplete="current-password" />
      </div>
      <div>
        <Label htmlFor="next">Nova senha</Label>
        <Input
          id="next"
          name="next"
          type="password"
          required
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        {pw.length > 0 && (
          <div className="mt-2">
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${i < s ? COLORS[s] : "bg-neutral-200 dark:bg-neutral-800"}`}
                />
              ))}
            </div>
            <p className="mt-1 text-[11px] text-neutral-500">
              {LABELS[s]} · mín. 8 caracteres, com maiúscula, minúscula e número
            </p>
          </div>
        )}
      </div>
      <div>
        <Label htmlFor="confirm">Confirmar nova senha</Label>
        <Input id="confirm" name="confirm" type="password" required autoComplete="new-password" />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-600">Senha alterada com sucesso.</p>}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Alterar senha"}
        </Button>
      </div>
    </form>
  );
}
