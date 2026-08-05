"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Download } from "lucide-react";
import { signDocumentAction, type SignState } from "@/lib/document-actions";
import { Button, Input, Label } from "@/components/ui";

export function SignForm({ id, defaultEmail }: { id: string; defaultEmail?: string }) {
  const bound = signDocumentAction.bind(null, id);
  const [state, formAction, pending] = useActionState<SignState, FormData>(bound, {});

  if (state.ok) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 size={20} />
          <p className="text-sm font-semibold">Documento assinado eletronicamente com sucesso.</p>
        </div>
        <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/70">
          Código de verificação: <span className="font-semibold">{state.code}</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            href={`/api/documentos/${id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
          >
            <Download size={13} /> Baixar via assinada
          </a>
          {state.code && (
            <Link
              href={`/verificar/${state.code}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
            >
              <ShieldCheck size={13} /> Verificar autenticidade
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="grid gap-3">
      <div>
        <Label htmlFor="signerName">Nome completo do signatário</Label>
        <Input id="signerName" name="signerName" placeholder="Seu nome completo" required />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="signerCpf">CPF</Label>
          <Input id="signerCpf" name="signerCpf" placeholder="000.000.000-00" required />
        </div>
        <div>
          <Label htmlFor="signerEmail">E-mail</Label>
          <Input id="signerEmail" name="signerEmail" type="email" defaultValue={defaultEmail} />
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
        <input type="checkbox" name="aceite" value="1" className="mt-0.5" />
        <span>
          Li o documento e concordo com o seu conteúdo. Reconheço que esta ação constitui minha assinatura
          eletrônica, com registro de data/hora, endereço IP e resumo criptográfico (SHA-256).
        </span>
      </label>
      {state.error && (
        <p className="text-sm font-medium text-red-600 dark:text-red-400">{state.error}</p>
      )}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Assinando…" : "Assinar eletronicamente"}
        </Button>
      </div>
    </form>
  );
}
