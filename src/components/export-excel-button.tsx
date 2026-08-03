"use client";

import { FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui";

type Column = { key: string; label: string };

/** Botão que gera um arquivo Excel (.xlsx) a partir de linhas e colunas passadas. */
export function ExportExcelButton({
  filename,
  columns,
  rows,
  sheetName = "Dados",
}: {
  filename: string;
  columns: Column[];
  rows: Record<string, unknown>[];
  sheetName?: string;
}) {
  function toXlsx() {
    const header = columns.map((c) => c.label);
    const body = rows.map((r) =>
      columns.map((c) => {
        const v = r[c.key];
        if (v == null) return "";
        return typeof v === "number" ? v : String(v);
      }),
    );
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    ws["!cols"] = columns.map((c) => ({ wch: Math.max(12, c.label.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    XLSX.writeFile(wb, filename);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={toXlsx} disabled={rows.length === 0}>
      <FileSpreadsheet size={14} /> Exportar Excel
    </Button>
  );
}
