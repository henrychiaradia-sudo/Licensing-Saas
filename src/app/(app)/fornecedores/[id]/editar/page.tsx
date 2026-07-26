import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getSupplierForEdit, listCountryOptions } from "@/lib/data/suppliers";
import { saveSupplier } from "../../actions";
import { SupplierForm } from "../../supplier-form";

export default async function EditSupplierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const [s, countries] = await Promise.all([
    getSupplierForEdit(session.tenantId, id),
    listCountryOptions(),
  ]);
  if (!s) notFound();

  const action = saveSupplier.bind(null, id);

  return (
    <div>
      <Link
        href={`/fornecedores/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> {s.tradeName ?? s.legalName}
      </Link>
      <h1 className="mb-1 text-xl font-bold">Editar fornecedor</h1>
      <p className="mb-6 text-sm text-neutral-500">{s.legalName}</p>
      <SupplierForm
        action={action}
        countries={countries.map((c) => ({ id: c.id, label: `${c.name} (${c.iso2})` }))}
        initial={{
          code: s.code,
          legalName: s.legalName,
          tradeName: s.tradeName,
          category: s.category,
          countryId: s.countryId,
          city: s.city,
          status: s.status,
          rating: s.rating,
          leadTimeDays: s.leadTimeDays,
          paymentTerms: s.paymentTerms,
          email: s.email,
          phone: s.phone,
        }}
      />
    </div>
  );
}
