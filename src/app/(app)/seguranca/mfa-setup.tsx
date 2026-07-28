"use client";

import Image from "next/image";
import { useActionState } from "react";
import { ShieldCheck, ShieldOff, QrCode } from "lucide-react";
import { Button, Input, Label, Badge } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import {
  beginMfaSetupAction,
  confirmMfaAction,
  disableMfaAction,
  type BeginState,
  type FormState,
} from "./actions";

export function MfaSetup({ enabled }: { enabled: boolean }) {
  const [begin, beginAction, beginPending] = useActionState<BeginState, FormData>(
    beginMfaSetupAction,
    { error: null },
  );
  const [confirm, confirmAction, confirmPending] = useActionState<FormState, FormData>(
    confirmMfaAction,
    { error: null },
  );

  if (enabled) {
    return (
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Badge tone="good">
            <ShieldCheck size={13} /> 2FA ativo
          </Badge>
          <span className="text-sm text-neutral-500">Sua conta pede um código do autenticador ao entrar.</span>
        </div>
        <form action={disableMfaAction}>
          <ConfirmButton
            message="Desativar o 2FA? Sua conta ficará protegida apenas pela senha."
            variant="outline"
            size="sm"
          >
            <ShieldOff size={14} /> Desativar 2FA
          </ConfirmButton>
        </form>
      </div>
    );
  }

  if (begin.qrDataUrl) {
    return (
      <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-start">
        <Image
          src={begin.qrDataUrl}
          alt="QR code para configurar o 2FA"
          width={220}
          height={220}
          unoptimized
          className="rounded-lg border border-neutral-200 dark:border-neutral-700"
        />
        <div>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            1. Escaneie o QR no seu app autenticador (Google Authenticator, Authy, 1Password…).
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Ou insira a chave manualmente:{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-neutral-800">
              {begin.secret}
            </code>
          </p>
          <form action={confirmAction} className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="code">2. Digite o código gerado</Label>
              <Input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                className="w-40 tracking-widest"
                required
              />
            </div>
            <Button type="submit" disabled={confirmPending}>
              {confirmPending ? "Verificando…" : "Confirmar e ativar"}
            </Button>
          </form>
          {confirm.error && <p className="mt-2 text-sm text-red-600">{confirm.error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-neutral-500">
        O 2FA adiciona uma segunda camada: além da senha, é preciso um código de 6 dígitos do seu
        aplicativo autenticador.
      </p>
      <form action={beginAction}>
        <Button type="submit" disabled={beginPending}>
          <QrCode size={15} /> {beginPending ? "Gerando…" : "Ativar 2FA"}
        </Button>
      </form>
      {begin.error && <p className="mt-2 text-sm text-red-600">{begin.error}</p>}
    </div>
  );
}
