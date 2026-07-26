import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listCountryOptions } from "@/lib/data/suppliers";
import { saveSupplier } from "../actions";
import { SupplierForm } from "../supplier-form";

export default async function NewSupplierPage() {
  await requireSession();
  const countries = await listCountryOptions();
  const action = saveSupplier.bind(null, null);

  return (
    <div>
      <Link
        href="/fornecedores"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Fornecedores
      </Link>
      <h1 className="mb-1 text-xl font-bold">Novo fornecedor</h1>
      <p className="mb-6 text-sm text-neutral-500">Cadastro na base de fornecedores</p>
      <SupplierForm
        action={action}
        countries={countries.map((c) => ({ id: c.id, label: `${c.name} (${c.iso2})` }))}
      />
    </div>
  );
}
