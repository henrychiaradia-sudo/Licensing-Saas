import { Card, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import type { ProductStatus } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";
const meta: Record<ProductStatus, { label: string; tone: Tone }> = {
  rascunho: { label: "Rascunho", tone: "neutral" },
  submetido: { label: "Submetido", tone: "info" },
  em_aprovacao: { label: "Em aprovação", tone: "info" },
  aprovado: { label: "Aprovado", tone: "good" },
  aprovado_com_ressalvas: { label: "Aprovado c/ ressalvas", tone: "warn" },
  reprovado: { label: "Reprovado", tone: "danger" },
  descontinuado: { label: "Descontinuado", tone: "neutral" },
};

type Version = {
  id: string;
  version: number;
  status: ProductStatus;
  submittedAt: Date | string | null;
  decidedAt: Date | string | null;
};

/** Histórico de versões de aprovação de um produto (só aparece quando há mais de uma). */
export function ProductVersions({
  versions,
  currentVersion,
}: {
  versions: Version[];
  currentVersion: number;
}) {
  if (versions.length <= 1) return null;

  return (
    <Card className="mt-4 p-5">
      <h2 className="mb-3 text-sm font-semibold">Versões</h2>
      <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {versions.map((v) => (
          <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
            <div>
              <div className="text-sm font-medium">
                Versão {v.version}
                {v.version === currentVersion && (
                  <span className="ml-2 text-xs font-normal text-neutral-400">atual</span>
                )}
              </div>
              <div className="text-xs text-neutral-400">
                submetida em {fmtDate(v.submittedAt)}
                {v.decidedAt ? ` · decidida em ${fmtDate(v.decidedAt)}` : ""}
              </div>
            </div>
            <Badge tone={meta[v.status].tone}>{meta[v.status].label}</Badge>
          </li>
        ))}
      </ul>
    </Card>
  );
}
