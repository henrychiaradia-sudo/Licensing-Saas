import Link from "next/link";
import { Download } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listAssets } from "@/lib/data/assets";
import { listBrands } from "@/lib/data/brands";
import { downloadAction } from "./actions";
import { Card, Badge, Button } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
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

export default async function BibliotecaPage({
  searchParams,
}: {
  searchParams: Promise<{ brand?: string }>;
}) {
  const session = await requireSession();
  const { brand: brandParam } = await searchParams;
  const brands = await listBrands(session.tenantId);
  const brandId = brandParam && brands.some((b) => b.id === brandParam) ? brandParam : undefined;
  const assets = await listAssets(session.tenantId, { brandId });

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Biblioteca Digital (DAM)</h1>
        <p className="text-sm text-neutral-500">
          Ativos oficiais de marca · cada download é registrado (quem, quando, versão)
        </p>
      </div>

      <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px]">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Marca</label>
          <select
            name="brand"
            defaultValue={brandId ?? ""}
            className="h-10 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Todas as marcas</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {brandId && (
          <Link href="/biblioteca" className="text-sm text-neutral-500 hover:underline">
            Limpar
          </Link>
        )}
      </form>

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
              <Row label="Última atualização" value={fmtDate(a.updatedAt)} />
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
