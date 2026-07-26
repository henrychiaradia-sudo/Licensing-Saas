import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listSupplierOptions } from "@/lib/data/purchase-orders";
import { InspectionForm } from "../inspection-form";

export default async function NewInspectionPage() {
  const session = await requireSession();
  const suppliers = await listSupplierOptions(session.tenantId);

  return (
    <div>
      <Link
        href="/qualidade"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Qualidade
      </Link>
      <h1 className="mb-1 text-xl font-bold">Nova inspeção</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Registre o resultado de uma inspeção de qualidade. Após criar, adicione não-conformidades se houver.
      </p>
      <InspectionForm
        suppliers={suppliers.map((s) => ({
          id: s.id,
          label: s.tradeName ? `${s.legalName} (${s.tradeName})` : s.legalName,
        }))}
      />
    </div>
  );
}
