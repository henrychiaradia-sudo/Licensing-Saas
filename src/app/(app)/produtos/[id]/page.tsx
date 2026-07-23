import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getProductDetail } from "@/lib/data/products";
import { approveStageAction } from "../actions";
import { Card, Badge, Button } from "@/components/ui";
import { fmtBRL } from "@/lib/utils";
import type { ApprovalStageType } from "@/lib/db/schema";

const stageLabels: Record<ApprovalStageType, string> = {
  produto: "Produto",
  marketing: "Marketing",
  branding: "Branding",
  juridico: "Jurídico",
  compliance: "Compliance",
  qualidade: "Qualidade",
  licensing: "Licensing",
  diretoria: "Diretoria",
};

export default async function ProdutoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getProductDetail(session.tenantId, id);
  if (!data) notFound();

  const { product, approval, stages } = data;
  const firstPendingIdx = stages.findIndex((s) => s.decision === "pendente");
  const doneCount = stages.filter((s) => s.decision === "aprovado").length;

  return (
    <div>
      <h1 className="text-xl font-bold">{product.name}</h1>
      <p className="mb-6 text-sm text-neutral-500">
        {product.sku} · {product.brandName} · {product.licenseeName}
      </p>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Workflow de aprovação — 8 alçadas</h2>
            <p className="text-xs text-neutral-500">
              {doneCount}/{stages.length || 8} alçadas aprovadas
            </p>
          </div>
          {approval && firstPendingIdx >= 0 ? (
            <form action={approveStageAction.bind(null, product.id, approval.id)}>
              <Button type="submit">Aprovar etapa: {stageLabels[stages[firstPendingIdx].stageType]}</Button>
            </form>
          ) : (
            <Badge tone="good">Aprovação concluída</Badge>
          )}
        </div>

        <div className="mt-6 flex items-start overflow-x-auto pb-2">
          {stages.map((s, i) => {
            const done = s.decision === "aprovado";
            const current = i === firstPendingIdx;
            const color = done ? "#16a34a" : current ? "#2563eb" : "#a3a3a3";
            const bg = done ? "#16a34a" : current ? "#2563eb" : "transparent";
            return (
              <div key={s.id} className="relative min-w-[84px] flex-1 text-center">
                {i > 0 && (
                  <div
                    className="absolute left-[-50%] top-4 h-0.5 w-full"
                    style={{ background: stages[i - 1].decision === "aprovado" ? "#16a34a" : "#e5e5e5" }}
                  />
                )}
                <div
                  className="relative z-10 mx-auto grid h-8 w-8 place-items-center rounded-full text-xs font-bold"
                  style={{ background: bg, color: s.decision === "pendente" && !current ? "#a3a3a3" : "#fff", border: `2px solid ${color}` }}
                >
                  {done ? "✓" : i + 1}
                </div>
                <div
                  className="mt-2 text-[11px]"
                  style={{ color: current ? undefined : "#9ca3af", fontWeight: current ? 600 : 400 }}
                >
                  {stageLabels[s.stageType]}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold">Ficha técnica</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Field label="Linha" value={product.productLine} />
          <Field label="Material" value={product.material} />
          <Field label="Cor" value={product.color} />
          <Field label="Fornecedor" value={product.supplierName} />
          <Field label="Código de barras" value={product.barcode} />
          <Field label="Preço sugerido" value={product.suggestedPrice ? fmtBRL(Number(product.suggestedPrice)) : "—"} />
          <Field label="Versão" value={`v${product.currentVersion}`} />
        </dl>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="font-medium">{value ?? "—"}</dd>
    </div>
  );
}
