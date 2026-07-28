import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listProducts } from "@/lib/data/products";
import { listSuppliers } from "@/lib/data/suppliers";
import { CostForm } from "../cost-form";
import { createCostSheetAction } from "../actions";

export default async function NewCostSheetPage() {
  const session = await requireSession();
  const [products, suppliers] = await Promise.all([
    listProducts(session.tenantId),
    listSuppliers(session.tenantId),
  ]);

  return (
    <div>
      <Link
        href="/custos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Gestão de Custos
      </Link>
      <h1 className="mb-1 text-xl font-bold">Nova ficha de custo</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Preencha os componentes — o custo total, o preço sugerido e a margem são calculados ao vivo à direita.
      </p>
      <CostForm
        action={createCostSheetAction}
        products={products.map((p) => ({ id: p.id, label: p.sku ? `${p.name} (${p.sku})` : p.name }))}
        suppliers={suppliers.map((s) => ({ id: s.id, label: s.tradeName ?? s.legalName }))}
      />
    </div>
  );
}
