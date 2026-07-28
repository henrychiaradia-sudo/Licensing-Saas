import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listSuppliers } from "@/lib/data/suppliers";
import { listCategoryOptions } from "@/lib/data/catalog";
import { SupplyContractForm } from "../contract-form";

export default async function NewSupplyContractPage() {
  const session = await requireSession();
  const [suppliers, categories] = await Promise.all([
    listSuppliers(session.tenantId),
    listCategoryOptions(session.tenantId),
  ]);

  return (
    <div>
      <Link
        href="/contratos-fornecimento"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Contratos de Fornecimento
      </Link>
      <h1 className="mb-1 text-xl font-bold">Novo contrato de fornecimento</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Registre um acordo-mestre com um fornecedor: SLA, vigência e condições.
      </p>
      <SupplyContractForm
        suppliers={suppliers.map((s) => ({
          id: s.id,
          label: `${s.tradeName ?? s.legalName} (${s.code})`,
        }))}
        categories={categories.map((c) => ({ id: c.id, label: c.name }))}
      />
    </div>
  );
}
