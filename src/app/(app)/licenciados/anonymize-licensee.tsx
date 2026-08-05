"use client";

import { useActionState, useState } from "react";
import { ShieldOff, AlertTriangle, CheckCircle2 } from "lucide-react";
import { anonymizeLicenseeAction, type AnonState } from "./actions";
import { Button, Card } from "@/components/ui";

export function AnonymizeLicensee({
  id,
  alreadyAnonymized,
}: {
  id: string;
  alreadyAnonymized: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const bound = anonymizeLicenseeAction.bind(null, id);
  const [state, formAction, pending] = useActionState<AnonState, FormData>(bound, {});

  const done = alreadyAnonymized || state.ok;

  return (
    <Card className="mt-6 border-red-200 p-5 dark:border-red-900/50">
      <div className="flex items-center gap-2">
        <ShieldOff size={16} className="text-red-600" />
        <h2 className="text-sm font-semibold text-red-700 dark:text-red-400">LGPD — Anonimização</h2>
      </div>

      {done ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 size={15} /> Os dados pessoais deste titular foram anonimizados.
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-neutral-500">
            Remove os dados pessoais/identificáveis (razão social, CNPJ/Tax ID, contatos, localização),
            mantendo o histórico de contratos e royalties para integridade. Ação <strong>irreversível</strong>,
            registrada na auditoria.
          </p>
          {!confirming ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              className="mt-3"
              onClick={() => setConfirming(true)}
            >
              <ShieldOff size={14} /> Anonimizar dados (LGPD)
            </Button>
          ) : (
            <form action={formAction} className="mt-3">
              <div className="mb-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                Esta ação é irreversível. Confirma a anonimização dos dados deste titular?
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" variant="danger" size="sm" disabled={pending}>
                  {pending ? "Anonimizando…" : "Confirmar anonimização"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
          {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
        </>
      )}
    </Card>
  );
}
