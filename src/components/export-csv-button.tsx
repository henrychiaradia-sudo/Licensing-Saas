"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui";

type Column = { key: string; label: string };

/** Botão que gera um CSV (com BOM p/ Excel) a partir de linhas e colunas passadas. */
export function ExportCsvButton({
  filename,
  columns,
  rows,
}: {
  filename: string;
  columns: Column[];
  rows: Record<string, unknown>[];
}) {
  function toCsv() {
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = columns.map((c) => esc(c.label)).join(",");
    const lines = rows.map((r) => columns.map((c) => esc(r[c.key])).join(","));
    const csv = [header, ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={toCsv} disabled={rows.length === 0}>
      <Download size={14} /> Exportar CSV
    </Button>
  );
}
