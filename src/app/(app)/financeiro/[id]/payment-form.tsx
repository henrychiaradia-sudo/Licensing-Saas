"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Banknote, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button, Input, Select, Label } from "@/components/ui";
import { registerPaymentDetailedAction } from "../actions";

const methods = [
  { v: "pix", l: "PIX" },
  { v: "boleto", l: "Boleto" },
  { v: "ted", l: "TED" },
  { v: "wire_transfer", l: "Wire transfer" },
  { v: "cartao", l: "Cartão" },
  { v: "outro", l: "Outro" },
];

type FormValues = { amount: number | string; method: string; paidAt: string; reference: string };

export function PaymentForm({
  receivableId,
  outstanding,
  today,
}: {
  receivableId: string;
  outstanding: number;
  today: string;
}) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit } = useForm<FormValues>({
    defaultValues: { amount: outstanding, method: "pix", paidAt: today, reference: "" },
  });

  async function onSubmit(data: FormValues) {
    setMsg(null);
    setSaving(true);
    const res = await registerPaymentDetailedAction(receivableId, {
      amount: Number(data.amount) || 0,
      method: data.method,
      paidAt: data.paidAt,
      reference: data.reference,
    });
    setSaving(false);
    if (res.ok) setMsg({ ok: true, text: "Pagamento registrado. O recebível foi atualizado." });
    else setMsg({ ok: false, text: res.error });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label>Valor (R$)</Label>
          <Input type="number" step="0.01" min="0" {...register("amount")} />
        </div>
        <div>
          <Label>Método</Label>
          <Select {...register("method")}>
            {methods.map((m) => (
              <option key={m.v} value={m.v}>
                {m.l}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Data</Label>
          <Input type="date" {...register("paidAt")} />
        </div>
        <div>
          <Label>Referência (opcional)</Label>
          <Input placeholder="Nº do comprovante" {...register("reference")} />
        </div>
      </div>

      {msg && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${
            msg.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
              : "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
          }`}
        >
          {msg.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
          {msg.text}
        </div>
      )}

      <div className="mt-4">
        <Button type="submit" disabled={saving}>
          <Banknote size={15} /> {saving ? "Registrando…" : "Registrar pagamento"}
        </Button>
        <p className="mt-2 text-xs text-neutral-400">
          Você pode registrar um valor parcial — o recebível fica como “Parcial” até a quitação.
        </p>
      </div>
    </form>
  );
}
