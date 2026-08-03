import { notFound } from "next/navigation";
import { CheckCircle2, AlertTriangle, XCircle, Download, ImageIcon } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getProductDetail, getProductApprovalVersions } from "@/lib/data/products";
import { listAssets } from "@/lib/data/assets";
import { decideStageAction } from "../actions";
import { downloadAction } from "../../biblioteca/actions";
import { ProductVersions } from "@/components/product-versions";
import { ProductPhoto } from "@/components/product-photo";
import { Card, Badge, Button } from "@/components/ui";
import { fmtBRL, fmtDate } from "@/lib/utils";
import type { ApprovalStageType, ApprovalDecision, ProductStatus } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

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

const decisionMeta: Record<ApprovalDecision, { label: string; tone: Tone }> = {
  pendente: { label: "Pendente", tone: "neutral" },
  aprovado: { label: "Aprovado", tone: "good" },
  aprovado_com_ressalvas: { label: "Aprovado c/ ressalvas", tone: "warn" },
  reprovado: { label: "Reprovado", tone: "danger" },
};

const productStatusMeta: Record<ProductStatus, { label: string; tone: Tone }> = {
  rascunho: { label: "Rascunho", tone: "neutral" },
  submetido: { label: "Submetido", tone: "info" },
  em_aprovacao: { label: "Em aprovação", tone: "info" },
  aprovado: { label: "Aprovado", tone: "good" },
  aprovado_com_ressalvas: { label: "Aprovado com ressalvas", tone: "warn" },
  reprovado: { label: "Reprovado", tone: "danger" },
  descontinuado: { label: "Descontinuado", tone: "neutral" },
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
  const brandAssets = product.brandId
    ? await listAssets(session.tenantId, { brandId: product.brandId })
    : [];
  const versions = await getProductApprovalVersions(session.tenantId, id);
  const firstPendingIdx = stages.findIndex((s) => s.decision === "pendente");
  const decidedCount = stages.filter((s) => s.decision !== "pendente").length;
  const currentStage = firstPendingIdx >= 0 ? stages[firstPendingIdx] : null;
  const isFinal =
    product.status === "aprovado" ||
    product.status === "aprovado_com_ressalvas" ||
    product.status === "reprovado";
  const reprovingStage = stages.find((s) => s.decision === "reprovado") ?? null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{product.name}</h1>
          <p className="text-sm text-neutral-500">
            {product.sku} · {product.brandName} · {product.licenseeName}
          </p>
        </div>
        <Badge tone={productStatusMeta[product.status].tone}>
          {productStatusMeta[product.status].label}
        </Badge>
      </div>

      {product.status === "aprovado" && (
        <Card className="mb-4 flex items-start gap-3 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-800 dark:text-emerald-300">
            Produto aprovado em todas as 8 alçadas. O licenciado já vê a liberação no portal.
          </p>
        </Card>
      )}
      {product.status === "aprovado_com_ressalvas" && (
        <Card className="mb-4 flex items-start gap-3 border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Produto aprovado com ressalvas. Confira os pareceres das alçadas abaixo.
          </p>
        </Card>
      )}
      {product.status === "reprovado" && (
        <Card className="mb-4 flex items-start gap-3 border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
          <p className="text-sm text-red-800 dark:text-red-300">
            Produto reprovado{reprovingStage ? ` na alçada ${stageLabels[reprovingStage.stageType]}` : ""}.
            {reprovingStage?.comment ? ` Motivo: ${reprovingStage.comment}` : ""}
          </p>
        </Card>
      )}

      {product.imageUrl && (
        <Card className="mb-4 p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Arte do produto</h2>
            <span className="text-xs text-neutral-400">Clique na imagem para ver em alta resolução</span>
          </div>
          <ProductPhoto src={product.imageUrl} alt={product.name} />
        </Card>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Workflow de aprovação — 8 alçadas</h2>
            <p className="text-xs text-neutral-500">
              {decidedCount}/{stages.length || 8} alçadas decididas
            </p>
          </div>
          {isFinal && (
            <Badge tone={productStatusMeta[product.status].tone}>
              {productStatusMeta[product.status].label}
            </Badge>
          )}
        </div>

        <div className="mt-6 flex items-start overflow-x-auto pb-2">
          {stages.map((s, i) => {
            const approved = s.decision === "aprovado" || s.decision === "aprovado_com_ressalvas";
            const caveat = s.decision === "aprovado_com_ressalvas";
            const reproved = s.decision === "reprovado";
            const current = i === firstPendingIdx;
            const color = reproved ? "#dc2626" : caveat ? "#d97706" : approved ? "#16a34a" : current ? "#2563eb" : "#a3a3a3";
            const bg = reproved ? "#dc2626" : caveat ? "#d97706" : approved ? "#16a34a" : current ? "#2563eb" : "transparent";
            const prev = stages[i - 1];
            const prevDone = prev && prev.decision !== "pendente";
            return (
              <div key={s.id} className="relative min-w-[84px] flex-1 text-center">
                {i > 0 && (
                  <div
                    className="absolute left-[-50%] top-4 h-0.5 w-full"
                    style={{ background: prev?.decision === "reprovado" ? "#dc2626" : prevDone ? "#16a34a" : "#e5e5e5" }}
                  />
                )}
                <div
                  className="relative z-10 mx-auto grid h-8 w-8 place-items-center rounded-full text-xs font-bold"
                  style={{
                    background: bg,
                    color: s.decision === "pendente" && !current ? "#a3a3a3" : "#fff",
                    border: `2px solid ${color}`,
                  }}
                >
                  {reproved ? "✕" : approved ? "✓" : i + 1}
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

      {currentStage && !isFinal && (
        <Card className="mt-4 p-5">
          <h2 className="text-sm font-semibold">
            Parecer — alçada {stageLabels[currentStage.stageType]}
          </h2>
          <p className="mb-3 text-xs text-neutral-500">
            Etapa {currentStage.sequence} de {stages.length}. Registre o parecer desta alçada.
          </p>
          <form action={decideStageAction.bind(null, product.id, currentStage.id)}>
            <textarea
              name="comment"
              rows={3}
              placeholder="Comentário / parecer (recomendado ao aprovar com ressalvas ou reprovar)"
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="submit" name="decision" value="aprovado">
                <CheckCircle2 size={15} /> Aprovar
              </Button>
              <Button type="submit" variant="outline" name="decision" value="aprovado_com_ressalvas">
                <AlertTriangle size={15} /> Aprovar com ressalvas
              </Button>
              <Button type="submit" variant="danger" name="decision" value="reprovado">
                <XCircle size={15} /> Reprovar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold">Pareceres por alçada</h2>
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {stages.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 py-2.5">
              <div>
                <div className="text-sm font-medium">
                  {s.sequence}. {stageLabels[s.stageType]}
                </div>
                {s.comment && (
                  <p className="mt-0.5 text-xs text-neutral-500">{s.comment}</p>
                )}
                {s.decidedAt && (
                  <p className="mt-0.5 text-[11px] text-neutral-400">{fmtDate(s.decidedAt)}</p>
                )}
              </div>
              <Badge tone={decisionMeta[s.decision].tone}>{decisionMeta[s.decision].label}</Badge>
            </li>
          ))}
          {stages.length === 0 && (
            <li className="py-6 text-center text-sm text-neutral-400">
              Sem alçadas cadastradas para este produto.
            </li>
          )}
        </ul>
      </Card>

      <ProductVersions versions={versions} currentVersion={product.currentVersion} />

      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold">Ficha técnica</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Field label="Linha" value={product.productLine} />
          <Field label="Material" value={product.material} />
          <Field label="Cor" value={product.color} />
          <Field label="Cor Pantone" value={product.pantone} />
          <Field label="Fornecedor" value={product.supplierName} />
          <Field label="UPC (código de barras)" value={product.barcode} />
          <Field label="UPI" value={product.upi} />
          <Field label="Código do Logo" value={product.logoCode} />
          <Field label="Preço sugerido (MSRP)" value={product.suggestedPrice ? fmtBRL(Number(product.suggestedPrice)) : "—"} />
          <Field label="Versão" value={`v${product.currentVersion}`} />
        </dl>
        <div className="mt-4 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <dt className="mb-1.5 text-xs text-neutral-400">Tecnologias aplicadas</dt>
          {product.technologies && product.technologies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {product.technologies.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm text-neutral-400">—</span>
          )}
        </div>
      </Card>

      <Card className="mt-4 p-5">
        <h2 className="mb-1 text-sm font-semibold">Assets da marca (Biblioteca Digital)</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Materiais oficiais de {product.brandName ?? "marca"} para aplicação neste produto. Cada download é registrado.
        </p>
        {brandAssets.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum ativo de marca disponível.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {brandAssets.slice(0, 8).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-400 dark:bg-neutral-800">
                    <ImageIcon size={15} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{a.name}</div>
                    <div className="text-[11px] text-neutral-400">
                      v{a.currentVersion} · {a.downloads}× baixado
                    </div>
                  </div>
                </div>
                <form action={downloadAction.bind(null, a.id)}>
                  <Button type="submit" variant="outline" size="sm">
                    <Download size={14} /> Baixar
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
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
