import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getLicensee, listSegments, listCountries } from "@/lib/data/licensees";
import { saveLicensee } from "../actions";
import { LicenseeForm } from "../licensee-form";

export default async function EditLicenseePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();
  const [licensee, segments, countries] = await Promise.all([
    getLicensee(session.tenantId, id),
    listSegments(session.tenantId),
    listCountries(),
  ]);
  if (!licensee) notFound();

  const action = saveLicensee.bind(null, id);
  const initial = {
    legalName: licensee.legalName,
    tradeName: licensee.tradeName,
    taxId: licensee.taxId,
    countryId: licensee.countryId,
    segmentId: licensee.segmentId,
    state: licensee.state,
    city: licensee.city,
    website: licensee.website,
    status: licensee.status,
    riskRating: licensee.riskRating,
    financialScore: licensee.financialScore ?? "",
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">{licensee.legalName}</h1>
      <p className="mb-6 text-sm text-neutral-500">Editar licenciado</p>
      <LicenseeForm action={action} initial={initial} segments={segments} countries={countries} />
    </div>
  );
}
