import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { getLicenseeBrandsForProduct, listTenantCategories } from "@/lib/data/portal";
import { Card } from "@/components/ui";
import { ProductForm } from "./product-form";

export default async function NovoProduto() {
  const session = await requireLicenseeSession();
  const [brands, categories] = await Promise.all([
    getLicenseeBrandsForProduct(session.tenantId, session.licenseeId),
    listTenantCategories(session.tenantId),
  ]);

  return (
    <div>
      <Link
        href="/portal/produtos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-emerald-700"
      >
        <ArrowLeft size={15} /> Produtos & Aprovações
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-bold">Submeter produto para aprovação</h1>
        <p className="text-sm text-neutral-500">
          Preencha a ficha do produto. Ele entra no fluxo de 8 alçadas e você acompanha o parecer de cada uma.
        </p>
      </div>

      {brands.length === 0 ? (
        <Card className="p-8 text-center text-sm text-neutral-500">
          Nenhuma marca licenciada encontrada nos seus contratos. Fale com o time de licenciamento.
        </Card>
      ) : (
        <ProductForm brands={brands} categories={categories} />
      )}
    </div>
  );
}
