import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Play, Pause, CheckCircle2, XCircle, MapPin } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getCampaignDetail } from "@/lib/data/marketing";
import { setCampaignStatusAction } from "../actions";
import { ActivationForm } from "../activation-form";
import { campaignStatusTone, campaignStatusLabel, campaignTypeLabel } from "../page";
import { Card, Badge, Button } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { fmtBRL, fmtDate } from "@/lib/utils";
import type { CampaignStatus, ActivationType } from "@/lib/db/schema";

const actTypeLabel: Record<ActivationType, string> = {
  pdv: "PDV",
  digital: "Digital",
  evento: "Evento",
  influencer: "Influencer",
  outro: "Outro",
};

const STATUS_ACTIONS: Record<CampaignStatus, { value: CampaignStatus; label: string; icon: React.ReactNode; variant?: "primary" | "outline" | "danger" }[]> = {
  planejamento: [{ value: "ativa", label: "Ativar", icon: <Play size={14} /> }],
  ativa: [
    { value: "pausada", label: "Pausar", icon: <Pause size={14} />, variant: "outline" },
    { value: "concluida", label: "Concluir", icon: <CheckCircle2 size={14} /> },
  ],
  pausada: [
    { value: "ativa", label: "Retomar", icon: <Play size={14} /> },
    { value: "cancelada", label: "Cancelar", icon: <XCircle size={14} />, variant: "danger" },
  ],
  concluida: [],
  cancelada: [],
};

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getCampaignDetail(session.tenantId, id);
  if (!data) notFound();
  const { campaign: c, activations } = data;
  const status = c.status as CampaignStatus;
  const budget = Number(c.budget);
  const spent = Number(c.spent);
  const usage = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const nextActions = STATUS_ACTIONS[status];

  return (
    <div>
      <Link
        href="/marketing"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Marketing &amp; Trade
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{c.name}</h1>
          <p className="text-sm text-neutral-500">
            {c.campaignNumber} · {campaignTypeLabel[c.campaignType]}
            {c.brandName ? ` · ${c.brandName}` : ""}
          </p>
        </div>
        <Badge tone={campaignStatusTone[status]}>{campaignStatusLabel[status]}</Badge>
      </div>

      {nextActions.length > 0 && (
        <Card className="mb-4 flex flex-wrap items-center gap-2 p-4">
          <span className="mr-2 text-sm text-neutral-500">Mudar status:</span>
          {nextActions.map((a) => (
            <form key={a.value} action={setCampaignStatusAction.bind(null, c.id)}>
              <input type="hidden" name="status" value={a.value} />
              {a.variant === "danger" ? (
                <ConfirmButton
                  message={`Confirmar "${a.label}" da campanha? Esta ação altera o status.`}
                  size="sm"
                  variant="danger"
                >
                  {a.icon} {a.label}
                </ConfirmButton>
              ) : (
                <Button type="submit" size="sm" variant={a.variant ?? "primary"}>
                  {a.icon} {a.label}
                </Button>
              )}
            </form>
          ))}
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Dados da campanha</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Field label="Licenciado" value={c.licenseeName} />
            <Field label="Canal" value={c.channel} />
            <Field label="Período" value={c.startDate ? `${fmtDate(c.startDate)} → ${fmtDate(c.endDate)}` : "—"} />
            <Field label="Objetivo" value={c.goal} />
          </dl>
          {c.notes && (
            <p className="mt-4 border-t border-neutral-100 pt-3 text-sm text-neutral-500 dark:border-neutral-800">
              {c.notes}
            </p>
          )}
        </Card>

        <Card className="p-5">
          <div className="text-xs font-medium text-neutral-500">Orçamento</div>
          <div className="mt-2 text-2xl font-bold tabular-nums">{fmtBRL(budget)}</div>
          <div className="mt-3 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
            <div
              className={`h-2 rounded-full ${usage > 100 ? "bg-red-500" : "bg-gradient-to-r from-blue-500 to-emerald-500"}`}
              style={{ width: `${Math.min(100, usage)}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            Gasto <strong className="tabular-nums">{fmtBRL(spent)}</strong> ({usage}%)
          </div>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="mb-1 text-sm font-semibold">Ativações de trade</h2>
        <p className="mb-3 text-xs text-neutral-500">
          Cada ativação soma ao gasto da campanha (PDV, digital, eventos…).
        </p>
        <div className="mb-4">
          <ActivationForm campaignId={c.id} />
        </div>
        {activations.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhuma ativação registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
                  <th className="px-3 py-2 font-medium">Ativação</th>
                  <th className="px-3 py-2 font-medium">Tipo</th>
                  <th className="px-3 py-2 font-medium">Local</th>
                  <th className="px-3 py-2 font-medium">Data</th>
                  <th className="px-3 py-2 text-right font-medium">Custo</th>
                </tr>
              </thead>
              <tbody>
                {activations.map((a) => (
                  <tr key={a.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                    <td className="px-3 py-2 font-medium">{a.name}</td>
                    <td className="px-3 py-2 text-neutral-500">{actTypeLabel[a.activationType as ActivationType]}</td>
                    <td className="px-3 py-2 text-neutral-500">
                      {a.location ? (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={12} /> {a.location}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-neutral-500">{fmtDate(a.scheduledAt)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{fmtBRL(Number(a.cost))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
