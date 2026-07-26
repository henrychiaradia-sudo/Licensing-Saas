import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Star, Pencil, CheckCircle2, Ban } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getSupplierDetail } from "@/lib/data/suppliers";
import { setSupplierStatusAction } from "../actions";
import { Card, Badge, Button } from "@/components/ui";
import { fmtMoney, fmtDate } from "@/lib/utils";
import { categoryLabel } from "../page";
import type { SupplierStatus, PoStatus } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

const statusTone: Record<SupplierStatus, Tone> = {
  em_homologacao: "warn",
  ativo: "good",
  inativo: "neutral",
  bloqueado: "danger",
};
const statusLabel: Record<SupplierStatus, string> = {
  em_homologacao: "Em homologação",
  ativo: "Ativo",
  inativo: "Inativo",
  bloqueado: "Bloqueado",
};
const poTone: Record<PoStatus, Tone> = {
  rascunho: "neutral",
  enviado: "info",
  confirmado: "info",
  em_producao: "warn",
  embarcado: "warn",
  recebido: "good",
  cancelado: "danger",
};
const poLabel: Record<PoStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  confirmado: "Confirmado",
  em_producao: "Em produção",
  embarcado: "Embarcado",
  recebido: "Recebido",
  cancelado: "Cancelado",
};

export default async function FornecedorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getSupplierDetail(session.tenantId, id);
  if (!data) notFound();
  const { supplier: s, orders } = data;

  return (
    <div>
      <Link
        href="/fornecedores"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Fornecedores
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{s.tradeName ?? s.legalName}</h1>
          <p className="text-sm text-neutral-500">
            {s.legalName} · {s.code} · {categoryLabel[s.category]}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone[s.status]}>{statusLabel[s.status]}</Badge>
          <Link href={`/fornecedores/${id}/editar`}>
            <Button variant="outline" size="sm">
              <Pencil size={14} /> Editar
            </Button>
          </Link>
        </div>
      </div>

      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          Homologação — gerencie a situação cadastral do fornecedor.
        </p>
        <div className="flex flex-wrap gap-2">
          {s.status === "em_homologacao" && (
            <form action={setSupplierStatusAction.bind(null, id, "ativo")}>
              <Button type="submit" size="sm">
                <CheckCircle2 size={14} /> Homologar
              </Button>
            </form>
          )}
          {s.status === "ativo" && (
            <form action={setSupplierStatusAction.bind(null, id, "inativo")}>
              <Button type="submit" size="sm" variant="outline">
                Inativar
              </Button>
            </form>
          )}
          {(s.status === "inativo" || s.status === "bloqueado") && (
            <form action={setSupplierStatusAction.bind(null, id, "ativo")}>
              <Button type="submit" size="sm">
                <CheckCircle2 size={14} /> Reativar
              </Button>
            </form>
          )}
          {s.status !== "bloqueado" && (
            <form action={setSupplierStatusAction.bind(null, id, "bloqueado")}>
              <Button type="submit" size="sm" variant="danger">
                <Ban size={14} /> Bloquear
              </Button>
            </form>
          )}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">Cadastro</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <Field label="Local" value={[s.city, s.countryName].filter(Boolean).join(" · ") || "—"} />
            <Field label="Lead time" value={s.leadTimeDays != null ? `${s.leadTimeDays} dias` : "—"} />
            <Field label="Pagamento" value={s.paymentTerms} />
            <Field
              label="Avaliação"
              value={s.rating != null ? `${Number(s.rating).toFixed(1).replace(".", ",")} / 5` : "—"}
            />
          </dl>
          <div className="mt-4 flex flex-wrap gap-4 border-t border-neutral-100 pt-3 text-sm dark:border-neutral-800">
            {s.email && (
              <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                <Mail size={14} /> {s.email}
              </span>
            )}
            {s.phone && (
              <span className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                <Phone size={14} /> {s.phone}
              </span>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Star size={15} className="fill-amber-400 text-amber-400" /> Desempenho
          </h2>
          <p className="text-sm text-neutral-500">
            {orders.length} pedido(s) de compra registrados com este fornecedor.
          </p>
        </Card>
      </div>

      <Card className="mt-4 overflow-x-auto p-0">
        <div className="p-5 pb-2">
          <h2 className="text-sm font-semibold">Pedidos de compra</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-2 font-medium">Pedido</th>
              <th className="px-5 py-2 font-medium">Data</th>
              <th className="px-5 py-2 font-medium">Previsão</th>
              <th className="px-5 py-2 text-right font-medium">Valor</th>
              <th className="px-5 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-neutral-100 last:border-0 dark:border-neutral-800">
                <td className="px-5 py-2">
                  <Link href={`/compras/${o.id}`} className="font-medium text-blue-600 hover:underline">
                    {o.poNumber}
                  </Link>
                </td>
                <td className="px-5 py-2 tabular-nums">{fmtDate(o.orderDate)}</td>
                <td className="px-5 py-2 tabular-nums">{fmtDate(o.expectedDate)}</td>
                <td className="px-5 py-2 text-right tabular-nums">{fmtMoney(o.totalAmount)}</td>
                <td className="px-5 py-2">
                  <Badge tone={poTone[o.status]}>{poLabel[o.status]}</Badge>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-sm text-neutral-400">
                  Nenhum pedido de compra.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
