import { ExportCsvButton } from "./export-csv-button";
import { ExportExcelButton } from "./export-excel-button";
import { ExportPdfButton } from "./export-pdf-button";

type Column = { key: string; label: string };

/** Trio de exportação (CSV · Excel · PDF) a partir das mesmas colunas/linhas. */
export function ExportGroup({
  filename,
  columns,
  rows,
  title,
  pdfOrientation,
}: {
  filename: string;
  columns: Column[];
  rows: Record<string, unknown>[];
  title?: string;
  pdfOrientation?: "portrait" | "landscape";
}) {
  const base = filename.replace(/\.(csv|xlsx|pdf)$/i, "");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <ExportCsvButton filename={`${base}.csv`} columns={columns} rows={rows} />
      <ExportExcelButton filename={`${base}.xlsx`} columns={columns} rows={rows} />
      <ExportPdfButton
        filename={`${base}.pdf`}
        columns={columns}
        rows={rows}
        title={title}
        orientation={pdfOrientation}
      />
    </div>
  );
}
