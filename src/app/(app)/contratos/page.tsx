import Link from "next/link";
import { Plus, Search, FileText, Mail, Phone } from "lucide-react";
import { requireSession, can } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/rbac";
import { listContracts } from "@/lib/data/contracts";
import { Button, Card, Badge, Input } from "@/components/ui";
import { ExportGroup } from "@/components/export-group";
import { HighlightScroll } from "@/components/highlight-scroll";
import { fmtMoney, fmtDate } from "@/lib/utils";
import { CONTRACT_STATUS } from "./schema";
import type { ContractStatus } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

const statusTone: Record<ContractStatus, Tone> = {
  rascunho: "neutral",
  em_aprovacao: "info",
  vigente: "good",
  suspenso: "warn",
  renovado: "good",
  expirado: "danger",
  encerrado: "neutral",
};
const statusLabel: Record<ContractStatus, string> = {
  rascunho: "Rascunho",
  em_aprovacao: "Em aprovação",
  vigente: "Vigente",
  suspenso: "Suspenso",
  renovado: "Renovado",
  expirado: "Expirado",
  encerrado: "Encerrado",
};

export default async function ContratosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; highlight?: string }>;
}) {
  const session = await requireSession();
  const { q, status, highlight } = await searchParams;
  const statusFilter =
    status && (CONTRACT_STATUS as readonly string[]).includes(status)
      ? (status as ContractStatus)
      : undefined;
  const contracts = await listContracts(session.tenantId, { q, status: statusFilter });
  const canWrite = can(session, PERMISSIONS.contractWrite);

  // Highlight vindo dos cards de "pontos de atenção" do dashboard (contratos vencendo em 60 dias).
  const soonIso = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const isHl = (c: (typeof contracts)[number]) =>
    highlight === "vencendo" && c.status === "vigente" && !!c.endDate && c.endDate <= soonIso;
  const firstHlId = contracts.find(isHl)?.id;
  const HL = "bg-amber-50 ring-2 ring-inset ring-amber-300 dark:bg-amber-950/30 dark:ring-amber-500/40";

  const csvColumns = [
    { key: "contrato", label: "Contrato" },
    { key: "licenciado", label: "Licenciado" },
    { key: "inicio", label: "Vigência Inicial" },
    { key: "fim", label: "Vigência Expiração" },
    { key: "email_resp", label: "E-mail do Responsável" },
    { key: "tel_resp", label: "Telefone do Responsável" },
    { key: "garantia", label: "Garantia mínima" },
    { key: "status", label: "Status" },
  ];
  const csvRows = contracts.map((c) => ({
    contrato: c.contractNumber,
    licenciado: c.licenseeName ?? "",
    inicio: c.startDate ?? "",
    fim: c.endDate ?? "",
    email_resp: c.responsibleEmail ?? "",
    tel_resp: c.responsiblePhone ?? "",
    garantia: c.minimumGuaranteeTotal != null ? Number(c.minimumGuaranteeTotal) : "",
    status: statusLabel[c.status],
  }));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Contratos</h1>
          <p className="text-sm text-neutral-500">
            Licenças, vigências, garantias mínimas e alertas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="info">{contracts.length} contrato(s)</Badge>
          <ExportGroup filename="contratos" columns={csvColumns} rows={csvRows} title="Contratos — ALIANZA" />
          {canWrite && (
            <Link href="/contratos/new">
              <Button>
                <Plus size={16} /> Novo contrato
              </Button>
            </Link>
          )}
        </div>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-neutral-500">Buscar</label>
          <div className="relative">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <Input
              name="q"
              defaultValue={q ?? ""}
              placeholder="Número do contrato ou licenciado"
              className="pl-9"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Status</label>
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Todos</option>
            {CONTRACT_STATUS.map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {(q || statusFilter) && (
          <Link href="/contratos" className="text-sm text-neutral-500 hover:underline">
            Limpar
          </Link>
        )}
      </form>

      {highlight === "vencendo" && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <span>Destacando contratos vigentes que vencem nos próximos 60 dias.</span>
          <Link href="/contratos" className="ml-auto text-xs font-medium hover:underline">
            Limpar destaque
          </Link>
        </div>
      )}
      {highlight && <HighlightScroll />}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-3 font-medium">Contrato</th>
              <th className="px-5 py-3 font-medium">Licenciado</th>
              <th className="px-5 py-3 font-medium">Vigência Inicial</th>
              <th className="px-5 py-3 font-medium">Vigência Expiração</th>
              <th className="px-5 py-3 font-medium">E-mail do Responsável</th>
              <th className="px-5 py-3 font-medium">Telefone do Responsável</th>
              <th className="px-5 py-3 text-right font-medium">Garantia mínima</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Arquivo PDF</th>
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <tr
                key={c.id}
                id={c.id === firstHlId ? "hl-first" : undefined}
                className={`border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50${isHl(c) ? " " + HL : ""}`}
              >
                <td className="px-5 py-3">
                  <Link
                    href={`/contratos/${c.id}`}
                    className="font-semibold text-blue-600 hover:underline"
                  >
                    {c.contractNumber}
                  </Link>
                  <div className="text-xs text-neutral-400">
                    {c.exclusivity === "exclusivo" ? "Exclusivo" : "Não exclusivo"}
                    {c.autoRenewal ? " · renova auto" : ""}
                  </div>
                </td>
                <td className="px-5 py-3">{c.licenseeName ?? "—"}</td>
                <td className="px-5 py-3 tabular-nums">{fmtDate(c.startDate)}</td>
                <td className="px-5 py-3 tabular-nums">{fmtDate(c.endDate)}</td>
                <td className="px-5 py-3">
                  {c.responsibleEmail ? (
                    <a
                      href={`mailto:${c.responsibleEmail}`}
                      className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-blue-600 dark:text-neutral-300"
                    >
                      <Mail size={13} className="text-neutral-400" />
                      {c.responsibleEmail}
                    </a>
                  ) : (
                    "—"
                  )}
                  {c.responsibleName && (
                    <div className="text-xs text-neutral-400">{c.responsibleName}</div>
                  )}
                </td>
                <td className="px-5 py-3">
                  {c.responsiblePhone ? (
                    <span className="inline-flex items-center gap-1.5 tabular-nums text-neutral-600 dark:text-neutral-300">
                      <Phone size={13} className="text-neutral-400" />
                      {c.responsiblePhone}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-3 text-right tabular-nums">
                  {fmtMoney(c.minimumGuaranteeTotal, c.currencyIso ?? "BRL")}
                </td>
                <td className="px-5 py-3">
                  <Badge tone={statusTone[c.status]}>{statusLabel[c.status]}</Badge>
                </td>
                <td className="px-5 py-3">
                  {c.pdfUri ? (
                    <a
                      href={c.pdfUri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:border-red-400 dark:border-neutral-700"
                    >
                      <FileText size={13} /> PDF
                    </a>
                  ) : (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nenhum contrato encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
