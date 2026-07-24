import { requireSession } from "@/lib/auth";
import { listAuditLog } from "@/lib/data/audit";
import { Card, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

const actionLabel: Record<string, string> = {
  login: "Acesso ao sistema",
  "royalty.approve": "Aprovou relatório de royalties",
  "payment.register": "Registrou pagamento",
  "supplier.create": "Cadastrou fornecedor",
  "purchase_order.create": "Criou pedido de compra",
  "contract.update": "Atualizou contrato",
  "contract.create": "Criou contrato",
  "product.approve": "Aprovou produto",
  "licensee.update": "Atualizou licenciado",
};

const entityLabel: Record<string, string> = {
  app_user: "Usuário",
  royalty_report: "Relatório",
  receivable: "Recebível",
  supplier: "Fornecedor",
  purchase_order: "Pedido",
  contract: "Contrato",
  product: "Produto",
  licensee: "Licenciado",
};

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

export default async function AuditoriaPage() {
  const session = await requireSession();
  const entries = await listAuditLog(session.tenantId);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Auditoria</h1>
          <p className="text-sm text-neutral-500">
            Trilha imutável de ações — quem fez o quê e quando
          </p>
        </div>
        <Badge tone="info">{entries.length} evento(s)</Badge>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-3 font-medium">Data / hora</th>
              <th className="px-5 py-3 font-medium">Usuário</th>
              <th className="px-5 py-3 font-medium">Ação</th>
              <th className="px-5 py-3 font-medium">Entidade</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="px-5 py-3 tabular-nums text-neutral-500">{fmtDateTime(e.occurredAt)}</td>
                <td className="px-5 py-3">{e.userName ?? "Sistema"}</td>
                <td className="px-5 py-3 font-medium">{actionLabel[e.action] ?? e.action}</td>
                <td className="px-5 py-3">
                  <Badge tone="neutral">{entityLabel[e.entityType] ?? e.entityType}</Badge>
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-neutral-400">
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
