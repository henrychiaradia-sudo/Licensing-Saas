import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listSupplierOptions } from "@/lib/data/purchase-orders";
import { listCurrencyOptions, listLicenseeOptions } from "@/lib/data/contracts";
import { PurchaseOrderForm } from "../po-form";
import { Card } from "@/components/ui";

export default async function NewPurchaseOrderPage() {
  const session = await requireSession();
  const [suppliers, currencies, licensees] = await Promise.all([
    listSupplierOptions(session.tenantId),
    listCurrencyOptions(),
    listLicenseeOptions(session.tenantId),
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
        />
      )}
    </div>
  );
}
