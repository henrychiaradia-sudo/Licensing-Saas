import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { getPortalProduct } from "@/lib/data/portal";
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

const statusMeta: Record<ProductStatus, { label: string; tone: Tone }> = {
  rascunho: { label: "Rascunho", tone: "neutral" },
  submetido: { label: "Submetido", tone: "info" },
  em_aprovacao: { label: "Em aprovação", tone: "info" },
  aprovado: { label: "Aprovado", tone: "good" },
  aprovado_com_ressalvas: { label: "Aprovado com ressalvas", tone: "warn" },
  reprovado: { label: "Reprovado", tone: "danger" },
  descontinuado: { label: "Descontinuado", tone: "neutral" },
};

export default async function PortalProdutoDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireLicenseeSession();
  const data = await getPortalProduct(session.tenantId, session.licenseeId, id);
  if (!data) notFound();

  const { product, stages } = data;
  const decidedCount = stages.filter((s) => s.decision !== "pendente").length;
  const total = stages.length || 8;
  const reprovingStage = stages.find((s) => s.decision === "reprovado") ?? null;

  return (
    <div>
      <Link
        href="/portal/produtos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-emerald-700"
      >
        <ArrowLeft size={15} /> Produtos & Aprovações
      </Link>

      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{product.name}</h1>
          <p className="text-sm text-neutral-500">
            {product.sku} · {product.brandName}
          </p>
        </div>
        <Badge tone={statusMeta[product.status].tone}>{statusMeta[product.status].label}</Badge>
      </div>

      {product.status === "aprovado" && (
        <Card className="mb-4 flex items-start gap-3 border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-800 dark:text-emerald-300">
            Produto aprovado em todas as alçadas. Você já pode seguir com a produção conforme o contrato.
          </p>
        </Card>
      )}
      {product.status === "aprovado_com_ressalvas" && (
        <Card className="mb-4 flex items-start gap-3 border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Produto aprovado com ressalvas. Leia os pareceres das alçadas abaixo antes de produzir.
          </p>
        </Card>
      )}
      {product.status === "reprovado" && (
        <Card className="mb-4 border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40">
          <div className="flex items-start gap-3">
            <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
            <p className="text-sm text-red-800 dark:text-red-300">
              Produto reprovado{reprovingStage ? ` na alçada ${stageLabels[reprovingStage.stageType]}` : ""}.
              {reprovingStage?.comment ? ` Motivo: ${reprovingStage.comment}` : ""}
            </p>
          </div>
          <div className="mt-3 pl-7">
            <Link href={`/portal/produtos/${product.id}/reenviar`}>
              <Button size="sm">
                <RefreshCw size={14} /> Reenviar nova versão
              </Button>
            </Link>
          </div>
        </Card>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Andamento da aprovação</h2>
            <p className="text-xs text-neutral-500">{decidedCount}/{total} alçadas decididas</p>
          </div>
        </div>
        <div className="mt-6 flex items-start overflow-x-auto pb-2">
          {stages.map((s, i) => {
            const approved = s.decision === "aprovado" || s.decision === "aprovado_com_ressalvas";
            const caveat = s.decision === "aprovado_com_ressalvas";
            const reproved = s.decision === "reprovado";
            const current = s.decision === "pendente" && stages.findIndex((x) => x.decision === "pendente") === i;
            const color = reproved ? "#dc2626" : caveat ? "#d97706" : approved ? "#16a34a" : current ? "#059669" : "#a3a3a3";
            const bg = reproved ? "#dc2626" : caveat ? "#d97706" : approved ? "#16a34a" : current ? "#059669" : "transparent";
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

      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold">Pareceres por alçada</h2>
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {stages.map((s) => (
            <li key={s.id} className="flex items-start justify-between gap-3 py-2.5">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  {s.decision === "pendente" && <Clock size={14} className="text-neutral-400" />}
                  {s.sequence}. {stageLabels[s.stageType]}
                </div>
                {s.comment && <p className="mt-0.5 text-xs text-neutral-500">{s.comment}</p>}
                {s.decidedAt && (
                  <p className="mt-0.5 text-[11px] text-neutral-400">{fmtDate(s.decidedAt)}</p>
                )}
              </div>
              <Badge tone={decisionMeta[s.decision].tone}>{decisionMeta[s.decision].label}</Badge>
            </li>
          ))}
          {stages.length === 0 && (
            <li className="py-6 text-center text-sm text-neutral-400">
              Aprovação ainda não iniciada.
            </li>
          )}
        </ul>
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
