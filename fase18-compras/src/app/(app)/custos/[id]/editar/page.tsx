import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getCostSheetDetail } from "@/lib/data/cost-sheets";
import { listProducts } from "@/lib/data/products";
import { listSuppliers } from "@/lib/data/suppliers";
import { CostForm, type CostDefaults } from "../../cost-form";
import { updateCostSheetAction } from "../../actions";

export default async function EditCostSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getCostSheetDetail(session.tenantId, id);
  if (!data) notFound();
  const [products, suppliers] = await Promise.all([
    listProducts(session.tenantId),
    listSuppliers(session.tenantId),
  ]);
  const s = data.sheet as unknown as Record<string, string | number | null>;

  return (
    <div>
      <Link
        href={`/custos/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> {data.sheet.name}
      </Link>
      <h1 className="mb-6 text-xl font-bold">Editar ficha de custo</h1>
      <CostForm
        action={updateCostSheetAction.bind(null, id)}
        submitLabel="Salvar alterações"
        products={products.map((p) => ({ id: p.id, label: p.sku ? `${p.name} (${p.sku})` : p.name }))}
        suppliers={suppliers.map((sp) => ({ id: sp.id, label: sp.tradeName ?? sp.legalName }))}
        defaults={s as CostDefaults}
      />
    </div>
  );
}
