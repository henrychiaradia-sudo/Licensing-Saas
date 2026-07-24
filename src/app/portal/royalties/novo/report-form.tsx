"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Send, AlertCircle } from "lucide-react";
import { Card, Button, Input, Select, Label } from "@/components/ui";
import { fmtMoney } from "@/lib/utils";
import { submitReportAction } from "../actions";

type Contract = { id: string; contractNumber: string; ratePct: number };

type Line = { sku: string; productName: string; units: number; grossAmount: number; deductions: number };
type FormValues = { contractId: string; referenceLabel: string; lines: Line[] };

const emptyLine: Line = { sku: "", productName: "", units: 0, grossAmount: 0, deductions: 0 };

export function ReportForm({ contracts, defaultRef }: { contracts: Contract[]; defaultRef: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      contractId: contracts[0]?.id ?? "",
      referenceLabel: defaultRef,
      lines: [{ ...emptyLine }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });

  const values = watch();
  const contract = contracts.find((c) => c.id === values.contractId) ?? contracts[0];
  const rate = (contract?.ratePct ?? 0) / 100;

  const rows = (values.lines ?? []).map((l) => {
    const gross = Number(l.grossAmount) || 0;
    const ded = Number(l.deductions) || 0;
    const net = gross - ded;
    const royalty = Math.max(0, net) * rate;
    return { net, royalty };
  });
  const totals = rows.reduce<{ gross: number; net: number; royalty: number; units: number }>(
    (acc, r, i) => {
      const l = values.lines[i];
      acc.gross += Number(l.grossAmount) || 0;
      acc.net += r.net;
      acc.royalty += r.royalty;
      acc.units += Number(l.units) || 0;
      return acc;
    },
    { gross: 0, net: 0, royalty: 0, units: 0 },
  );

  async function onSubmit(data: FormValues) {
    setServerError(null);
    setSubmitting(true);
    const payload = {
      contractId: data.contractId,
      referenceLabel: data.referenceLabel,
      lines: data.lines.map((l) => ({
        sku: l.sku ?? "",
        productName: l.productName ?? "",
        units: Number(l.units) || 0,
        grossAmount: Number(l.grossAmount) || 0,
        deductions: Number(l.deductions) || 0,
      })),
    };
    const res = await submitReportAction(payload);
    // Em caso de sucesso, o servidor redireciona; só chegamos aqui em erro.
    if (res && !res.ok) {
      setServerError(res.error);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Contrato</Label>
            <Select {...register("contractId")}>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.contractNumber} · royalty {c.ratePct.toLocaleString("pt-BR")}%
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Competência (AAAA-MM)</Label>
            <Input placeholder="2026-07" {...register("referenceLabel")} />
            {errors.referenceLabel && (
              <p className="mt-1 text-xs text-red-600">{errors.referenceLabel.message}</p>
            )}
          </div>
        </div>
      </Card>

      <Card className="mt-4 overflow-x-auto p-0">
        <div className="flex items-center justify-between p-5 pb-2">
          <h2 className="text-sm font-semibold">Linhas de venda</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => append({ ...emptyLine })}>
            <Plus size={14} /> Adicionar linha
          </Button>
        </div>
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-4 py-2 font-medium">SKU</th>
              <th className="px-4 py-2 font-medium">Produto</th>
              <th className="px-4 py-2 text-right font-medium">Unid.</th>
              <th className="px-4 py-2 text-right font-medium">Venda bruta</th>
              <th className="px-4 py-2 text-right font-medium">Deduções</th>
              <th className="px-4 py-2 text-right font-medium">Líquido</th>
              <th className="px-4 py-2 text-right font-medium">Royalty</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f, i) => (
              <tr key={f.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="px-4 py-2">
                  <Input className="min-w-24" {...register(`lines.${i}.sku`)} />
                </td>
                <td className="px-4 py-2">
                  <Input className="min-w-40" {...register(`lines.${i}.productName`)} />
                </td>
                <td className="px-4 py-2">
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    className="w-24 text-right"
                    {...register(`lines.${i}.units`, { valueAsNumber: true })}
                  />
                </td>
                <td className="px-4 py-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-32 text-right"
                    {...register(`lines.${i}.grossAmount`, { valueAsNumber: true })}
                  />
                </td>
                <td className="px-4 py-2">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="w-32 text-right"
                    {...register(`lines.${i}.deductions`, { valueAsNumber: true })}
                  />
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-neutral-500">
                  {fmtMoney(rows[i]?.net ?? 0)}
                </td>
                <td className="px-4 py-2 text-right font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
                  {fmtMoney(rows[i]?.royalty ?? 0)}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => fields.length > 1 && remove(i)}
                    className="grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:hover:bg-red-950/40"
                    disabled={fields.length <= 1}
                    aria-label="Remover linha"
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Summary label="Vendas brutas" value={fmtMoney(totals.gross)} />
        <Summary label="Vendas líquidas" value={fmtMoney(totals.net)} />
        <Summary label={`Alíquota`} value={`${(contract?.ratePct ?? 0).toLocaleString("pt-BR")}%`} />
        <Summary label="Royalty a pagar" value={fmtMoney(totals.royalty)} highlight />
      </div>

      {serverError && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {serverError}
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          <Send size={15} /> {submitting ? "Enviando…" : "Enviar reporte"}
        </Button>
        <p className="text-xs text-neutral-400">
          Ao enviar, o sistema roda as validações automáticas e registra o reporte.
        </p>
      </div>
    </form>
  );
}

function Summary({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-neutral-500">{label}</div>
      <div
        className={`mt-1.5 text-lg font-bold tabular-nums ${highlight ? "text-emerald-700 dark:text-emerald-400" : ""}`}
      >
        {value}
      </div>
    </Card>
  );
}
