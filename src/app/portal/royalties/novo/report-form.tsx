"use client";

import { useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Send, AlertCircle, Upload, Download } from "lucide-react";
import { Card, Button, Input, Select, Label } from "@/components/ui";
import { fmtMoney } from "@/lib/utils";
import { computeRoyalty, type RoyaltyRuleInput, type TierInput } from "@/lib/royalties-engine";
import { submitReportAction } from "../actions";

type Contract = {
  id: string;
  contractNumber: string;
  ratePct: number;
  rule: RoyaltyRuleInput | null;
  tiers: TierInput[];
};

type Line = { sku: string; productName: string; units: number; grossAmount: number; deductions: number };
type FormValues = { contractId: string; referenceLabel: string; lines: Line[] };

const emptyLine: Line = { sku: "", productName: "", units: 0, grossAmount: 0, deductions: 0 };

/** Converte texto numérico BR (1.500,00) ou US (1,500.00 / 1500) em número. */
function parseNum(s: string): number {
  if (!s) return 0;
  let t = s.trim().replace(/["R$\s]/g, "");
  if (!t) return 0;
  if (t.includes(",") && t.includes(".")) t = t.replace(/\./g, "").replace(",", ".");
  else if (t.includes(",")) t = t.replace(",", ".");
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

function parseCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === sep) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}

/** Colunas esperadas: sku, produto, unidades, venda_bruta, deducoes. */
function parseCsv(text: string): Line[] {
  const raw = text
    .replace(/\r/g, "")
    .split("\n")
    .filter((l) => l.trim().length);
  if (raw.length === 0) return [];
  const sep = raw[0].includes(";") ? ";" : ",";
  const first = parseCsvLine(raw[0], sep);
  const looksHeader = first.length >= 3 && Number.isNaN(Number((first[2] ?? "").replace(",", ".")));
  const rows = looksHeader ? raw.slice(1) : raw;
  return rows
    .map((line) => {
      const c = parseCsvLine(line, sep);
      return {
        sku: (c[0] ?? "").trim(),
        productName: (c[1] ?? "").trim(),
        units: parseNum(c[2] ?? ""),
        grossAmount: parseNum(c[3] ?? ""),
        deductions: parseNum(c[4] ?? ""),
      };
    })
    .filter((l) => l.sku || l.productName || l.units > 0 || l.grossAmount > 0);
}

export function ReportForm({ contracts, defaultRef }: { contracts: Contract[]; defaultRef: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
  const { fields, append, remove, replace } = useFieldArray({ control, name: "lines" });

  const values = watch();
  const contract = contracts.find((c) => c.id === values.contractId) ?? contracts[0];

  // Prévia com o mesmo motor do servidor (faixas escalonadas, piso/teto).
  const lineCalc = (values.lines ?? []).map((l) => {
    const gross = Number(l.grossAmount) || 0;
    const ded = Number(l.deductions) || 0;
    const net = gross - ded;
    return { gross, net, base: Math.max(0, net), units: Number(l.units) || 0 };
  });
  const baseTotal = lineCalc.reduce((a, r) => a + r.base, 0);
  const comp = computeRoyalty(
    baseTotal,
    contract?.rule ?? { royaltyType: "percentual", percentage: contract?.ratePct ?? null },
    contract?.tiers ?? [],
  );
  const effRate = comp.effectiveRate;
  const rows = lineCalc.map((r) => ({ net: r.net, royalty: r.base * effRate }));
  const totals = {
    gross: lineCalc.reduce((a, r) => a + r.gross, 0),
    net: lineCalc.reduce((a, r) => a + r.net, 0),
    royalty: comp.royalty,
    units: lineCalc.reduce((a, r) => a + r.units, 0),
  };

  function downloadTemplate() {
    const csv =
      "sku,produto,unidades,venda_bruta,deducoes\n" +
      "VB-CAMP-001,Camiseta oficial NovaSport,30000,1500000,120000\n" +
      "VB-SHRT-002,Shorts performance,20000,1000000,80000\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo-reporte-royalties.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCsv(String(reader.result ?? ""));
      if (parsed.length === 0) {
        setImportMsg("Nenhuma linha válida encontrada no arquivo.");
      } else {
        replace(parsed);
        setImportMsg(`${parsed.length} linha(s) importada(s) do CSV.`);
      }
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsText(file);
  }

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
                  {c.contractNumber} ·{" "}
                  {c.rule?.royaltyType === "escalonado" && c.tiers.length
                    ? "royalty escalonado"
                    : `royalty ${c.ratePct.toLocaleString("pt-BR")}%`}
                </option>
              ))}
            </Select>
            {contract?.rule?.royaltyType === "escalonado" && (contract.tiers?.length ?? 0) > 0 && (
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">
                Royalty escalonado · {contract.tiers.length} faixa(s) progressivas
              </p>
            )}
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
        <div className="flex flex-wrap items-center justify-between gap-2 p-5 pb-2">
          <h2 className="text-sm font-semibold">Linhas de venda</h2>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".csv,text/csv"
              ref={fileRef}
              onChange={onFile}
              className="hidden"
            />
            <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate}>
              <Download size={14} /> Baixar modelo
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Importar CSV
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ ...emptyLine })}>
              <Plus size={14} /> Adicionar linha
            </Button>
          </div>
        </div>
        {importMsg && (
          <div className="mx-5 mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
            {importMsg}
          </div>
        )}
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th scope="col" className="px-4 py-2 font-medium">SKU</th>
              <th scope="col" className="px-4 py-2 font-medium">Produto</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Unid.</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Venda bruta</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Deduções</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Líquido</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Royalty</th>
              <th scope="col" className="px-4 py-2"></th>
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
        <Summary
          label={comp.isTiered ? "Alíquota efetiva" : "Alíquota"}
          value={`${(effRate * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}
        />
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
