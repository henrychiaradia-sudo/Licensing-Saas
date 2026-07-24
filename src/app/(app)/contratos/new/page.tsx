import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import {
  listLicenseeOptions,
  listCurrencyOptions,
  listBrandOptions,
} from "@/lib/data/contracts";
import { saveContract } from "../actions";
import { ContractForm } from "../contract-form";

export default async function NewContractPage() {
  const session = await requireSession();
  const [licensees, currencies, brands] = await Promise.all([
    listLicenseeOptions(session.tenantId),
    listCurrencyOptions(),
    listBrandOptions(session.tenantId),
  ]);
  const action = saveContract.bind(null, null);

  return (
    <div>
      <Link
        href="/contratos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Contratos
      </Link>
      <h1 className="mb-1 text-xl font-bold">Novo contrato</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Cadastro de licença: vigência, garantia mínima e marcas licenciadas
      </p>
      <ContractForm
        action={action}
        licensees={licensees.map((l) => ({ id: l.id, label: l.legalName }))}
        currencies={currencies.map((c) => ({ id: c.id, label: `${c.isoCode} — ${c.name}` }))}
        brands={brands}
      />
    </div>
  );
}
