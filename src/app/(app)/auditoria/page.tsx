import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listAuditLog } from "@/lib/data/audit";
import { Card, Badge, Button } from "@/components/ui";
import { ExportCsvButton } from "@/components/export-csv-button";

const actionLabel: Record<string, string> = {
  login: "Acesso ao sistema",
  "royalty.approve": "Aprovou relatório de royalties",
  "payment.register": "Registrou pagamento",
  "supplier.create": "Cadastrou fornecedor",
  "supplier.update": "Atualizou fornecedor",
  "supplier.status": "Alterou status de fornecedor",
  "supplier.evaluation": "Avaliou fornecedor (scorecard)",
  "shipment.create": "Registrou embarque",
  "shipment.status": "Alterou status de embarque",
  "purchase_order.create": "Criou pedido de compra",
  "purchase_order.status": "Alterou status de pedido",
  "purchase_order.receive": "Registrou recebimento",
  "requisition.decide": "Decidiu requisição",
  "requisition.convert": "Converteu requisição em pedido",
  "sourcing.award": "Selecionou proposta vencedora",
  "contract.update": "Atualizou contrato",
  "contract.create": "Criou contrato",
  "contract.amendment": "Registrou aditivo contratual",
  "product.approve": "Aprovou produto",
  "licensee.update": "Atualizou licenciado",
  "quality.inspection.create": "Registrou inspeção de qualidade",
  "quality.inspection.result": "Atualizou resultado de inspeção",
  "quality.nc.create": "Registrou não-conformidade",
  "quality.nc.status": "Alterou status de não-conformidade",
  "quality.nc.supplier_response": "Fornecedor respondeu não-conformidade (portal)",
  "opportunity.create": "Criou oportunidade",
  "opportunity.stage": "Moveu oportunidade de estágio",
  "opportunity.convert": "Converteu oportunidade em licenciado",
  "campaign.create": "Criou campanha de marketing",
  "campaign.status": "Alterou status de campanha",
  "campaign.activation": "Registrou ativação de trade",
  "catalog.item.create": "Cadastrou item no catálogo",
  "category.create": "Criou categoria",
  "legal.case.create": "Abriu caso jurídico",
  "legal.case.status": "Alterou status de caso jurídico",
  "legal.case.event": "Registrou andamento jurídico",
  "task.create": "Criou tarefa",
  "task.status": "Alterou status de tarefa",
  "supply_contract.create": "Criou contrato de fornecimento",
  "supply_contract.status": "Alterou status de contrato de fornecimento",
  "security.login": "Acesso realizado",
  "security.lockout": "Conta bloqueada por tentativas",
  "security.mfa_enabled": "Ativou 2FA",
  "security.mfa_disabled": "Desativou 2FA",
  "security.password_change": "Alterou a senha",
  "access.role_permission": "Alterou permissões de perfil",
  "access.user_role": "Alterou usuários de perfil",
};

const entityLabel: Record<string, string> = {
  app_user: "Usuário",
  royalty_report: "Relatório",
  receivable: "Recebível",
  supplier: "Fornecedor",
  purchase_order: "Pedido",
  purchase_requisition: "Requisição",
  sourcing_event: "Sourcing",
  contract: "Contrato",
  product: "Produto",
  licensee: "Licenciado",
  quality_inspection: "Inspeção",
  non_conformity: "Não-conformidade",
  shipment: "Embarque",
  licensing_opportunity: "Oportunidade",
  marketing_campaign: "Campanha",
  catalog_item: "Item de catálogo",
  category: "Categoria",
  legal_case: "Caso jurídico",
  task: "Tarefa",
  supply_contract: "Contrato de fornecimento",
  security: "Segurança",
  role: "Perfil de acesso",
};

const ENTITY_FILTERS = [
  "contract",
  "supplier",
  "purchase_order",
  "purchase_requisition",
  "sourcing_event",
  "quality_inspection",
  "non_conformity",
  "shipment",
  "licensing_opportunity",
  "marketing_campaign",
  "catalog_item",
  "legal_case",
  "task",
  "supply_contract",
  "royalty_report",
  "receivable",
] as const;

function fmtDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function summaryText(changes: unknown): string {
  if (changes && typeof changes === "object" && "summary" in changes) {
    const s = (changes as { summary?: unknown }).summary;
    if (typeof s === "string") return s;
  }
  return "—";
}

/** Extrai um diff legível antes→depois do jsonb de mudanças, se presente. */
function changeDiff(changes: unknown): { field: string; before: string; after: string }[] {
  if (!changes || typeof changes !== "object") return [];
  const c = changes as { before?: Record<string, unknown>; after?: Record<string, unknown> };
  if (!c.before && !c.after) return [];
  const keys = new Set([...Object.keys(c.before ?? {}), ...Object.keys(c.after ?? {})]);
  const out: { field: string; before: string; after: string }[] = [];
  for (const k of keys) {
    const b = c.before?.[k];
    const a = c.after?.[k];
    if (JSON.stringify(b) === JSON.stringify(a)) continue;
    out.push({ field: k, before: b == null ? "—" : String(b), after: a == null ? "—" : String(a) });
  }
  return out;
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  const session = await requireSession();
  const { entity } = await searchParams;
  const entityFilter =
    entity && (ENTITY_FILTERS as readonly string[]).includes(entity) ? entity : undefined;
  const entries = await listAuditLog(session.tenantId, { entityType: entityFilter });

  const distinctUsers = new Set(entries.map((e) => e.userName ?? "Sistema")).size;
  const lastEvent = entries[0]?.occurredAt ?? null;

  const csvColumns = [
    { key: "data", label: "Data / hora" },
    { key: "usuario", label: "Usuário" },
    { key: "ip", label: "IP" },
    { key: "acao", label: "Ação" },
    { key: "entidade", label: "Entidade" },
    { key: "detalhe", label: "Detalhe" },
  ];
  const csvRows = entries.map((e) => {
    const diff = changeDiff(e.changes);
    const diffText = diff.map((d) => `${d.field}: ${d.before} → ${d.after}`).join("; ");
    return {
      data: fmtDateTime(e.occurredAt),
      usuario: e.userName ?? e.actorName ?? "Sistema",
      ip: e.actorIp ?? "",
      acao: actionLabel[e.action] ?? e.action,
      entidade: entityLabel[e.entityType] ?? e.entityType,
      detalhe: diffText ? `${summaryText(e.changes)} (${diffText})` : summaryText(e.changes),
    };
  });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Auditoria</h1>
          <p className="text-sm text-neutral-500">
            Trilha imutável de ações — quem fez o quê e quando
          </p>
        </div>
        <ExportCsvButton filename="auditoria.csv" columns={csvColumns} rows={csvRows} />
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-xs font-medium text-neutral-500">Eventos</div>
          <div className="mt-3 text-2xl font-bold tabular-nums">{entries.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-medium text-neutral-500">Usuários distintos</div>
          <div className="mt-3 text-2xl font-bold tabular-nums">{distinctUsers}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs font-medium text-neutral-500">Último evento</div>
          <div className="mt-3 text-sm font-semibold tabular-nums">
            {lastEvent ? fmtDateTime(lastEvent) : "—"}
          </div>
        </Card>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-500">Entidade</label>
          <select
            name="entity"
            defaultValue={entityFilter ?? ""}
            className="h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-blue-400 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Todas</option>
            {ENTITY_FILTERS.map((e) => (
              <option key={e} value={e}>
                {entityLabel[e] ?? e}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
        {entityFilter && (
          <Link href="/auditoria" className="text-sm text-neutral-500 hover:underline">
            Limpar
          </Link>
        )}
      </form>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-3 font-medium">Data / hora</th>
              <th className="px-5 py-3 font-medium">Usuário</th>
              <th className="px-5 py-3 font-medium">Ação</th>
              <th className="px-5 py-3 font-medium">Entidade</th>
              <th className="px-5 py-3 font-medium">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="px-5 py-3 tabular-nums text-neutral-500">{fmtDateTime(e.occurredAt)}</td>
                <td className="px-5 py-3">
                  <div>{e.userName ?? e.actorName ?? "Sistema"}</div>
                  {e.actorIp && <div className="text-[11px] tabular-nums text-neutral-400">IP {e.actorIp}</div>}
                </td>
                <td className="px-5 py-3 font-medium">{actionLabel[e.action] ?? e.action}</td>
                <td className="px-5 py-3">
                  <Badge tone="neutral">{entityLabel[e.entityType] ?? e.entityType}</Badge>
                </td>
                <td className="px-5 py-3 text-neutral-500">
                  <div>{summaryText(e.changes)}</div>
                  {changeDiff(e.changes).map((d, i) => (
                    <div key={i} className="mt-0.5 text-[11px]">
                      <span className="text-neutral-400">{d.field}: </span>
                      <span className="text-red-500 line-through">{d.before}</span>
                      <span className="text-neutral-400"> → </span>
                      <span className="font-medium text-emerald-600">{d.after}</span>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nenhum evento de auditoria registrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
