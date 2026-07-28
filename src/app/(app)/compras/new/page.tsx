import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listSupplierOptions } from "@/lib/data/purchase-orders";
import { listCurrencyOptions, listLicenseeOptions } from "@/lib/data/contracts";
import { listPurchaseContractOptions } from "@/lib/data/purchase-contracts";
import { listBudgetCategoryOptions } from "@/lib/data/purchase-budget";
import { PurchaseOrderForm } from "../po-form";
import { Card } from "@/components/ui";

export default async function NewPurchaseOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ contrato?: string }>;
}) {
  const session = await requireSession();
  const { contrato } = await searchParams;
  const [suppliers, currencies, licensees, contracts, categories] = await Promise.all([
    listSupplierOptions(session.tenantId),
    listCurrencyOptions(),
    listLicenseeOptions(session.tenantId),
    listPurchaseContractOptions(session.tenantId),
    listBudgetCategoryOptions(session.tenantId),
  ]);

  return (
    <div>
      <Link
        href="/compras"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Pedidos de Compra
      </Link>
      <h1 className="mb-1 text-xl font-bold">Novo pedido de compra</h1>
      <p className="mb-6 text-sm text-neutral-500">Fornecedor, itens e condições de entrega</p>

      {suppliers.length === 0 ? (
        <Card className="p-8 text-center text-sm text-neutral-500">
          Cadastre um fornecedor antes de criar um pedido de compra.
        </Card>
      ) : (
        <PurchaseOrderForm
          suppliers={suppliers.map((s) => ({
            id: s.id,
            label: `${s.tradeName ?? s.legalName} (${s.code})`,
          }))}
          currencies={currencies.map((c) => ({ id: c.id, label: `${c.isoCode} — ${c.name}` }))}
          licensees={licensees.map((l) => ({ id: l.id, label: l.legalName }))}
          contracts={contracts.map((c) => ({
            id: c.id,
            label: `${c.contractNumber} — ${c.title} · saldo ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: c.currency || "BRL" }).format(c.available)}`,
          }))}
          categories={categories.map((c) => ({ id: c.id, label: `${c.name} (${c.code})` }))}
          defaultContractId={contrato ?? ""}
        />
      )}
    </div>
  );
}
