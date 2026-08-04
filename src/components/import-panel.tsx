"use client";

import { useState } from "react";
import Link from "next/link";
import { Upload, FileDown, CheckCircle2, AlertTriangle, XCircle, Copy, ArrowRight } from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";
import { previewImportAction, commitImportAction } from "@/lib/import-actions";
import type { ImportEntity, PreviewResult, CommitResult } from "@/lib/data/import";

type Tone = "good" | "warn" | "danger" | "neutral";
const statusMeta: Record<string, { label: string; tone: Tone }> = {
  ok: { label: "OK", tone: "good" },
  duplicate: { label: "Duplicado", tone: "warn" },
  error: { label: "Erro", tone: "danger" },
};

export function ImportPanel({
  entity,
  displayColumns,
  templateCsv,
  templateFilename,
  backHref,
  backLabel,
}: {
  entity: ImportEntity;
  displayColumns: string[];
  templateCsv: string;
  templateFilename: string;
  backHref: string;
  backLabel: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [busy, setBusy] = useState<"idle" | "preview" | "commit">("idle");

  async function runPreview() {
    if (!file) return;
    setBusy("preview");
    setResult(null);
    const fd = new FormData();
    fd.set("file", file);
    const r = await previewImportAction(entity, fd);
    setPreview(r);
    setBusy("idle");
  }

  async function runCommit() {
    if (!file) return;
    setBusy("commit");
    const fd = new FormData();
    fd.set("file", file);
    const r = await commitImportAction(entity, fd);
    setResult(r);
    setPreview(null);
    setBusy("idle");
  }

  function downloadTemplate() {
    const blob = new Blob(["﻿" + templateCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = templateFilename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const valid = preview?.summary.valid ?? 0;

  return (
    <div className="grid gap-4">
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">1. Baixe o modelo e preencha</h2>
            <p className="text-xs text-neutral-500">
              Aceita CSV e Excel (.xlsx). A 1ª linha deve ser o cabeçalho. Até 2.000 linhas por vez.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <FileDown size={14} /> Baixar modelo CSV
          </Button>
        </div>

        <h2 className="mb-2 text-sm font-semibold">2. Envie o arquivo preenchido</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-4 py-2.5 text-sm hover:border-blue-400 dark:border-neutral-700">
            <Upload size={15} className="text-neutral-400" />
            <span className="text-neutral-600 dark:text-neutral-300">
              {file ? file.name : "Escolher arquivo (.csv ou .xlsx)"}
            </span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setPreview(null);
                setResult(null);
              }}
            />
          </label>
          <Button type="button" onClick={runPreview} disabled={!file || busy !== "idle"}>
            {busy === "preview" ? "Analisando…" : "Pré-visualizar"}
          </Button>
        </div>
      </Card>

      {preview && !preview.ok && (
        <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
          <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <p className="text-sm text-red-800 dark:text-red-300">{preview.error}</p>
        </Card>
      )}

      {preview && preview.ok && (
        <Card className="p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">3. Confira a prévia</h2>
              <Badge tone="neutral">{preview.summary.total} linha(s)</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="good">{preview.summary.valid} a importar</Badge>
              {preview.summary.duplicates > 0 && <Badge tone="warn">{preview.summary.duplicates} duplicado(s)</Badge>}
              {preview.summary.errors > 0 && <Badge tone="danger">{preview.summary.errors} com erro</Badge>}
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-800">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800 dark:bg-neutral-900">
                  <th className="px-3 py-2 font-medium">Linha</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  {displayColumns.map((c) => (
                    <th key={c} className="px-3 py-2 font-medium">
                      {c}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-medium">Observações</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => {
                  const meta = statusMeta[r.status];
                  return (
                    <tr
                      key={r.line}
                      className={`border-b border-neutral-100 last:border-0 dark:border-neutral-800 ${
                        r.status === "error"
                          ? "bg-red-50/50 dark:bg-red-950/20"
                          : r.status === "duplicate"
                            ? "bg-amber-50/50 dark:bg-amber-950/20"
                            : ""
                      }`}
                    >
                      <td className="px-3 py-2 tabular-nums text-neutral-400">{r.line}</td>
                      <td className="px-3 py-2">
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </td>
                      {r.cells.map((c, i) => (
                        <td key={i} className="px-3 py-2 text-neutral-600 dark:text-neutral-300">
                          {c}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-xs text-neutral-500">{r.messages.join(" ")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {preview.shownRows < preview.summary.total && (
            <p className="mt-2 text-xs text-neutral-400">
              Mostrando as primeiras {preview.shownRows} de {preview.summary.total} linhas. A importação processa
              todas.
            </p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <Button type="button" onClick={runCommit} disabled={valid === 0 || busy !== "idle"}>
              {busy === "commit" ? "Importando…" : `Importar ${valid} válido(s)`}
            </Button>
            <span className="text-xs text-neutral-500">
              Linhas com erro são ignoradas; duplicados não são recriados.
            </span>
          </div>
        </Card>
      )}

      {result && (
        <Card
          className={`p-5 ${result.ok ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/30" : "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/30"}`}
        >
          <div className="flex items-start gap-3">
            {result.ok ? (
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
            ) : (
              <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
            )}
            <div className="flex-1">
              {result.ok ? (
                <>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    Importação concluída — {result.inserted} registro(s) criado(s).
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-300/70">
                    {result.skippedDuplicates} duplicado(s) ignorado(s) · {result.failed} falha(s).
                  </p>
                </>
              ) : (
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">{result.error}</p>
              )}
              {result.failures.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-red-700 dark:text-red-300">
                  {result.failures.map((f) => (
                    <li key={f.line}>
                      Linha {f.line} ({f.label}): {f.message}
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={backHref}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
              >
                Ver {backLabel} <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </Card>
      )}

      <div className="flex items-center gap-1.5 text-xs text-neutral-400">
        <Copy size={12} />
        Dica: mantenha os cabeçalhos do modelo. Nomes de país, categoria, marca e segmento são casados pelo
        nome; se não existirem, o campo fica em branco (não bloqueia a linha).
      </div>
    </div>
  );
}
