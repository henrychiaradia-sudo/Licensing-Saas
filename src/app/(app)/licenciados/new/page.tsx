import { requireSession } from "@/lib/auth";
import { listSegments, listCountries } from "@/lib/data/licensees";
import { saveLicensee } from "../actions";
import { LicenseeForm } from "../licensee-form";

export default async function NewLicenseePage() {
  const session = await requireSession();
  const [segments, countries] = await Promise.all([
    listSegments(session.tenantId),
    listCountries(),
  ]);
  const action = saveLicensee.bind(null, null);

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Novo licenciado</h1>
      <p className="mb-6 text-sm text-neutral-500">Cadastro mestre de parceiros</p>
      <LicenseeForm action={action} segments={segments} countries={countries} />
    </div>
  );
}
