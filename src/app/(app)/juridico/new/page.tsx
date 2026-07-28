import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listBrandOptions } from "@/lib/data/contracts";
import { listLicensees } from "@/lib/data/licensees";
import { CaseForm } from "../case-form";

export default async function NewLegalCasePage() {
  const session = await requireSession();
  const [brands, licensees] = await Promise.all([
    listBrandOptions(session.tenantId),
    listLicensees(session.tenantId),
  ]);

  return (
    <div>
      <Link
        href="/juridico"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Jurídico
      </Link>
      <h1 className="mb-1 text-xl font-bold">Novo caso jurídico</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Registre um caso e acompanhe andamentos, prazos e valor em risco.
      </p>
      <CaseForm
        brands={brands.map((b) => ({ id: b.id, label: `${b.name} (${b.code})` }))}
        licensees={licensees.map((l) => ({ id: l.id, label: l.tradeName ?? l.legalName }))}
      />
    </div>
  );
}
