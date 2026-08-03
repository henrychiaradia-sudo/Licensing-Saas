"use client";

import { FileDown } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Button } from "@/components/ui";

type Column = { key: string; label: string };

const BRAND: [number, number, number] = [37, 99, 235]; // ALIANZA blue-600

/** Botão que gera um PDF de apresentação (cabeçalho ALIANZA + tabela + rodapé). */
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
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const dateStr = new Date().toLocaleDateString("pt-BR");
    const hasTitle = !!title;
    const tableTop = hasTitle ? 98 : 78;

    autoTable(doc, {
      head: [columns.map((c) => c.label)],
      body: rows.map((r) =>
        columns.map((c) => {
          const v = r[c.key];
          return v == null ? "" : String(v);
        }),
      ),
      startY: tableTop,
      margin: { top: tableTop, left: 40, right: 40, bottom: 42 },
      styles: { fontSize: 8, cellPadding: 4, overflow: "linebreak" },
      headStyles: { fillColor: BRAND, textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      didDrawPage: (data) => {
        // Faixa de cabeçalho (marca)
        doc.setFillColor(BRAND[0], BRAND[1], BRAND[2]);
        doc.rect(0, 0, pageW, 58, "F");
        // Marca (quadrado branco + "A")
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(40, 17, 24, 24, 5, 5, "F");
        doc.setTextColor(BRAND[0], BRAND[1], BRAND[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text("A", 52, 34, { align: "center" });
        // Nome + subtítulo da marca
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(15);
        doc.setFont("helvetica", "bold");
        doc.text("ALIANZA", 74, 30);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text("BRAND LICENSING PLATFORM", 74, 42);
        // Data (direita, dentro da faixa)
        doc.setFontSize(8.5);
        doc.text(dateStr, pageW - 40, 35, { align: "right" });
        // Título do relatório (abaixo da faixa)
        if (hasTitle) {
          doc.setTextColor(30, 41, 59);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(12);
          doc.text(title as string, 40, 82);
        }
        // Rodapé
        doc.setTextColor(150, 150, 150);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.text("Plataforma de Licenciamento ALIANZA", 40, pageH - 18);
        doc.text(`Página ${data.pageNumber}`, pageW - 40, pageH - 18, { align: "right" });
        doc.setTextColor(0, 0, 0);
      },
    });
    doc.save(filename);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={toPdf} disabled={rows.length === 0}>
      <FileDown size={14} /> Exportar PDF
    </Button>
  );
}
