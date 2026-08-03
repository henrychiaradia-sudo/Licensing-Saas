import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import {
  getContractForEdit,
  listLicenseeOptions,
  listCurrencyOptions,
  listBrandOptions,
} from "@/lib/data/contracts";
import { saveContract } from "../../actions";
import { ContractForm } from "../../contract-form";

export default async function EditContractPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const [c, licensees, currencies, brands] = await Promise.all([
    getContractForEdit(session.tenantId, id),
    listLicenseeOptions(session.tenantId),
    listCurrencyOptions(),
    listBrandOptions(session.tenantId),
  ]);
  if (!c) notFound();

  const action = saveContract.bind(null, id);

  return (
    <div>
      <Link
        href={`/contratos/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> {c.contractNumber}
      </Link>
      <h1 className="mb-1 text-xl font-bold">Editar contrato</h1>
      <p className="mb-6 text-sm text-neutral-500">{c.contractNumber}</p>
      <ContractForm
        action={action}
        licensees={licensees.map((l) => ({ id: l.id, label: l.legalName }))}
        currencies={currencies.map((cu) => ({ id: cu.id, label: `${cu.isoCode} — ${cu.name}` }))}
        brands={brands}
        initial={{
          contractNumber: c.contractNumber,
          licenseeId: c.licenseeId,
          currencyId: c.currencyId,
          status: c.status,
          exclusivity: c.exclusivity,
          signingDate: c.signingDate,
          startDate: c.startDate,
          endDate: c.endDate,
          autoRenewal: c.autoRenewal,
          renewalTermMonths: c.renewalTermMonths,
          minimumGuaranteeTotal: c.minimumGuaranteeTotal,
          insuranceRequired: c.insuranceRequired,
          insuranceInfo: c.insuranceInfo,
          notes: c.notes,
          responsibleName: c.responsibleName,
          responsibleEmail: c.responsibleEmail,
          responsiblePhone: c.responsiblePhone,
          brandIds: c.brandIds,
        }}
      />
    </div>
  );
}
