import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listSupplierOptions } from "@/lib/data/purchase-orders";
import { listSupplyContractRefOptions } from "@/lib/data/purchase-contracts";
import { ContractForm } from "../contract-form";
import { Card } from "@/components/ui";

export default async function NewPurchaseContractPage() {
  const session = await requireSession();
  const [suppliers, supplyContracts] = await Promise.all([
    listSupplierOptions(session.tenantId),
    listSupplyContractRefOptions(session.tenantId),
  ]);

  return (
    <div>
      <Link
        href="/contratos-compra"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Contratos de Compra
      </Link>
      <h1 className="mb-1 text-xl font-bold">Novo contrato de compra</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Defina o valor comprometido e a vigência; os pedidos vinculados consomem o saldo
      </p>

      {suppliers.length === 0 ? (
        <Card className="p-8 text-center text-sm text-neutral-500">
          Cadastre um fornecedor antes de criar um contrato de compra.
        </Card>
      ) : (
        <ContractForm
          suppliers={suppliers.map((s) => ({
            id: s.id,
            label: `${s.tradeName ?? s.legalName} (${s.code})`,
          }))}
          supplyContracts={supplyContracts.map((c) => ({
            id: c.id,
            label: `${c.contractNumber} — ${c.title}`,
          }))}
        />
      )}
    </div>
  );
}
