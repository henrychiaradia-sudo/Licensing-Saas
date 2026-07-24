import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { requireLicenseeSession } from "@/lib/auth";
import { getPortalProduct } from "@/lib/data/portal";
import { ResubmitForm } from "./resubmit-form";

export default async function ReenviarProduto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireLicenseeSession();
  const data = await getPortalProduct(session.tenantId, session.licenseeId, id);
  if (!data) notFound();
  const { product: p } = data;
  if (p.status !== "reprovado") redirect(`/portal/produtos/${id}`);

  return (
    <div>
      <Link
        href={`/portal/produtos/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-emerald-700"
      >
        <ArrowLeft size={15} /> Voltar ao produto
      </Link>

      <div className="mb-5">
        <h1 className="text-xl font-bold">Reenviar nova versão — {p.name}</h1>
        <p className="text-sm text-neutral-500">
          Ajuste a ficha conforme o parecer da reprovação e reenvie. Uma nova versão reinicia as 8 alçadas
          de aprovação.
        </p>
      </div>

      <ResubmitForm
        productId={id}
        sku={p.sku}
        brandName={p.brandName ?? "—"}
        initial={{
          name: p.name,
          productLine: p.productLine ?? "",
          material: p.material ?? "",
          color: p.color ?? "",
          supplierName: p.supplierName ?? "",
          suggestedPrice: p.suggestedPrice != null ? Number(p.suggestedPrice) : "",
          imageUrl: p.imageUrl ?? "",
        }}
      />
    </div>
  );
}
