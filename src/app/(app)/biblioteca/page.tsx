import { Download } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listAssets } from "@/lib/data/assets";
import { downloadAction } from "./actions";
import { Card, Badge, Button } from "@/components/ui";
import type { DamAssetType } from "@/lib/db/schema";

const typeLabels: Record<DamAssetType, string> = {
  logo: "Logo",
  vetor: "Vetor",
  psd: "PSD",
  ai: "AI",
  png: "PNG",
  foto: "Foto",
  campanha: "Campanha",
  video: "Vídeo",
  brand_book: "Brand Book",
  guia: "Guia",
  arquivo_juridico: "Jurídico",
  template: "Template",
};

function fmtBytes(n: number | null) {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1).replace(".", ",")} ${units[i]}`;
}

export default async function BibliotecaPage() {
  const session = await requireSession();
  const assets = await listAssets(session.tenantId);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Biblioteca Digital (DAM)</h1>
        <p className="text-sm text-neutral-500">
          Ativos oficiais de marca · cada download é registrado (quem, quando, versão)
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((a) => (
          <Card key={a.id} className="flex flex-col p-5">
            <div className="mb-3 flex items-start justify-between">
              <Badge tone="info">{typeLabels[a.assetType]}</Badge>
              <span className="text-xs text-neutral-400">v{a.currentVersion}</span>
            </div>
            <h3 className="text-sm font-semibold">{a.name}</h3>
            <p className="mb-3 text-xs text-neutral-500">{a.brandName ?? "—"}</p>

            <div className="mt-auto space-y-1.5 border-t border-neutral-100 pt-3 text-xs dark:border-neutral-800">
              <Row label="Downloads" value={`${a.downloads}×`} />
              <Row label="Tamanho" value={fmtBytes(a.sizeBytes)} />
            </div>

            {a.tags && a.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {a.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-500 dark:bg-neutral-800"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            <form action={downloadAction.bind(null, a.id)} className="mt-4">
              <Button type="submit" variant="outline" className="w-full">
                <Download size={15} /> Baixar
              </Button>
            </form>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-neutral-400">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
