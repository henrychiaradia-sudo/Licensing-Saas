import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listBrandOptions } from "@/lib/data/contracts";
import { listLicensees } from "@/lib/data/licensees";
import { listPlanOptions } from "@/lib/data/marketing-plans";
import { CampaignForm } from "../campaign-form";
import { createCampaignAction } from "../../actions";

export default async function NewCampaignPage() {
  const session = await requireSession();
  const [brands, licensees, plans] = await Promise.all([
    listBrandOptions(session.tenantId),
    listLicensees(session.tenantId),
    listPlanOptions(session.tenantId),
  ]);

  return (
    <div>
      <Link
        href="/marketing/campanhas"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Campanhas
      </Link>
      <h1 className="mb-1 text-xl font-bold">Nova campanha</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Defina objetivo, público, verba e vínculo com plano/marca. As ações somam o realizado.
      </p>
      <CampaignForm
        action={createCampaignAction}
        brands={brands.map((b) => ({ id: b.id, label: `${b.name} (${b.code})` }))}
        licensees={licensees.map((l) => ({ id: l.id, label: l.tradeName ?? l.legalName }))}
        plans={plans.map((p) => ({ id: p.id, label: `${p.planNumber} · ${p.name}` }))}
      />
    </div>
  );
}
