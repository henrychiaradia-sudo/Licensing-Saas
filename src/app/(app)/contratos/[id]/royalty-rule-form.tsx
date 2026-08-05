"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button, Input, Select, Label } from "@/components/ui";
import { computeRoyalty } from "@/lib/royalties-engine";
import { saveRoyaltyRuleAction } from "./actions";

type TierRow = { tierFrom: number | string; tierTo: number | string; rate: number | string };
export type RuleFormValues = {
  royaltyType: "percentual" | "escalonado";
  base: "gross_sales" | "net_sales" | "units";
  percentage: number | string;
  minRoyalty: number | string;
  maxRoyalty: number | string;
  tiers: TierRow[];
};

const emptyTier: TierRow = { tierFrom: "", tierTo: "", rate: "" };

export function RoyaltyRuleForm({
  contractId,
  initial,
  iso,
}: {
  contractId: string;
  initial: RuleFormValues;
  iso: string;
}) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const { register, control, handleSubmit, watch } = useForm<RuleFormValues>({
    defaultValues: initial,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "tiers" });
  const type = watch("royaltyType");
  const values = watch();

  // Simulação rápida em cima de uma base de exemplo (R$ 1,5 mi) para dar feedback visual.
  const sampleBase = 1_500_000;
  const sample = computeRoyalty(
    sampleBase,
    {
      royaltyType: type,
      percentage: values.percentage === "" ? null : Number(values.percentage),
      minRoyalty: values.minRoyalty === "" ? null : Number(values.minRoyalty),
      maxRoyalty: values.maxRoyalty === "" ? null : Number(values.maxRoyalty),
    },
    type === "escalonado"
      ? (values.tiers ?? [])
          .filter((t) => t.tierFrom !== "" && t.rate !== "")
          .map((t) => ({
            tierFrom: Number(t.tierFrom),
            tierTo: t.tierTo === "" ? null : Number(t.tierTo),
            rate: Number(t.rate),
          }))
      : [],
  );

  async function onSubmit(data: RuleFormValues) {
    setMsg(null);
    setSaving(true);
    const res = await saveRoyaltyRuleAction(contractId, data);
    setSaving(false);
    if (res.ok) setMsg({ ok: true, text: "Regra salva. Os próximos reportes usarão esta configuração." });
    else setMsg({ ok: false, text: res.error });
  }

  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: iso, maximumFractionDigits: 0 });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Tipo de royalty</Label>
          <Select {...register("royaltyType")}>
            <option value="percentual">Percentual (alíquota única)</option>
            <option value="escalonado">Escalonado (faixas)</option>
          </Select>
        </div>
        <div>
          <Label>Base de cálculo</Label>
          <Select {...register("base")}>
            <option value="net_sales">Vendas líquidas</option>
            <option value="gross_sales">Vendas brutas</option>
            <option value="units">Unidades</option>
          </Select>
        </div>
        {type === "percentual" && (
          <div>
            <Label>Alíquota (%)</Label>
            <Input type="number" step="0.01" min="0" placeholder="10" {...register("percentage")} />
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Piso mínimo (opcional)</Label>
          <Input type="number" step="0.01" min="0" placeholder="sem mínimo" {...register("minRoyalty")} />
        </div>
        <div>
          <Label>Teto máximo (opcional)</Label>
          <Input type="number" step="0.01" min="0" placeholder="sem teto" {...register("maxRoyalty")} />
        </div>
      </div>

      {type === "escalonado" && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Faixas progressivas</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ ...emptyTier })}>
              <Plus size={14} /> Adicionar faixa
            </Button>
          </div>
          <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th scope="col" className="px-3 py-2 font-medium">A partir de (R$)</th>
                  <th scope="col" className="px-3 py-2 font-medium">Até (R$ — vazio = sem limite)</th>
                  <th scope="col" className="px-3 py-2 font-medium">Alíquota (%)</th>
                  <th scope="col" className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((f, i) => (
                  <tr key={f.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="px-3 py-2">
                      <Input type="number" step="0.01" min="0" {...register(`tiers.${i}.tierFrom`)} />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" step="0.01" min="0" placeholder="∞" {...register(`tiers.${i}.tierTo`)} />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="number" step="0.01" min="0" {...register(`tiers.${i}.rate`)} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => remove(i)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        aria-label="Remover faixa"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
                {fields.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-sm text-neutral-400">
                      Nenhuma faixa. Clique em “Adicionar faixa”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg bg-neutral-50 px-4 py-3 text-sm dark:bg-neutral-800/50">
        <span className="text-neutral-500">Simulação sobre {fmt(sampleBase)} de base: </span>
        <span className="font-semibold tabular-nums text-blue-600">{fmt(sample.royalty)}</span>
        <span className="text-neutral-400">
          {" "}
          · alíquota efetiva {(sample.effectiveRate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%
        </span>
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
          <Save size={15} /> {saving ? "Salvando…" : "Salvar regra"}
        </Button>
      </div>
    </form>
  );
}
