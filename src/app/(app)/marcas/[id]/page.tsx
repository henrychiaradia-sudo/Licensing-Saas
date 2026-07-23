import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getBrand } from "@/lib/data/brands";
import { saveBrand } from "../actions";
import { BrandForm } from "../brand-form";

export default async function EditBrandPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const b = await getBrand(session.tenantId, id);
  if (!b) notFound();

  const action = saveBrand.bind(null, id);
  const initial = {
    code: b.code,
    name: b.name,
    ownerArea: b.ownerArea,
    status: b.status,
    language: b.language,
    description: b.description,
    validFrom: b.validFrom,
    validTo: b.validTo,
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">{b.name}</h1>
      <p className="mb-6 text-sm text-neutral-500">Editar marca / IP</p>
      <BrandForm action={action} initial={initial} />
    </div>
  );
}
