import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { importDisplayColumns, importTemplateCsv } from "@/lib/data/import";
import { ImportPanel } from "@/components/import-panel";

export default async function ImportarLicenciadosPage() {
  await requireSession();
  return (
    <div>
      <div className="mb-5">
        <Link
          href="/licenciados"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
        >
          <ArrowLeft size={14} /> Licenciados
        </Link>
        <h1 className="text-xl font-bold">Importar licenciados</h1>
        <p className="text-sm text-neutral-500">
          Carregue uma planilha (CSV ou Excel) para criar vários licenciados de uma vez, com prévia e
          validação antes de gravar.
        </p>
      </div>

      <ImportPanel
        entity="licensees"
        displayColumns={importDisplayColumns("licensees")}
        templateCsv={importTemplateCsv("licensees")}
        templateFilename="modelo-licenciados.csv"
        backHref="/licenciados"
        backLabel="licenciados"
      />
    </div>
  );
}
