"use client";

import { FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui";

type Column = { key: string; label: string };

/** Botão que gera um PDF em tabela (com título) a partir de linhas e colunas passadas. */
export function ExportPdfButton({
  filename,
  columns,
  rows,
  title,
  orientation = "landscape",
}: {
  filename: string;
  columns: Column[];
  rows: Record<string, unknown>[];
  title?: string;
  orientation?: "portrait" | "landscape";
}) {
  function toPdf() {
    const doc = new jsPDF({ orientation, unit: "pt", format: "a4" });
    let startY = 40;
    if (title) {
      doc.setFontSize(14);
      doc.text(title, 40, 40);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(new Date().toLocaleDateString("pt-BR"), 40, 56);
      doc.setTextColor(0);
      startY = 70;
    }
    autoTable(doc, {
      head: [columns.map((c) => c.label)],
      body: rows.map((r) =>
        columns.map((c) => {
          const v = r[c.key];
          return v == null ? "" : String(v);
        }),
      ),
      startY,
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { left: 40, right: 40 },
    });
    doc.save(filename);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={toPdf} disabled={rows.length === 0}>
      <FileDown size={14} /> Exportar PDF
    </Button>
  );
}
