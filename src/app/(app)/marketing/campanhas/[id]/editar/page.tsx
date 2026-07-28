import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getCampaignDetail } from "@/lib/data/marketing";
import { listBrandOptions } from "@/lib/data/contracts";
import { listLicensees } from "@/lib/data/licensees";
import { listPlanOptions } from "@/lib/data/marketing-plans";
import { CampaignForm } from "../../campaign-form";
import { updateCampaignAction } from "../../../actions";

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getCampaignDetail(session.tenantId, id);
  if (!data) notFound();
  const c = data.campaign;
  const [brands, licensees, plans] = await Promise.all([
    listBrandOptions(session.tenantId),
    listLicensees(session.tenantId),
    listPlanOptions(session.tenantId),
  ]);

  return (
    <div>
      <Link
        href={`/marketing/campanhas/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> {c.name}
      </Link>
      <h1 className="mb-6 text-xl font-bold">Editar campanha</h1>
      <CampaignForm
        action={updateCampaignAction.bind(null, id)}
        submitLabel="Salvar alterações"
        brands={brands.map((b) => ({ id: b.id, label: `${b.name} (${b.code})` }))}
        licensees={licensees.map((l) => ({ id: l.id, label: l.tradeName ?? l.legalName }))}
        plans={plans.map((p) => ({ id: p.id, label: `${p.planNumber} · ${p.name}` }))}
        defaults={{
          name: c.name,
          brandId: c.brandId,
          licenseeId: c.licenseeId,
          planId: c.planId,
          campaignType: c.campaignType,
          status: c.status,
          budget: c.budget,
          channel: c.channel,
          goal: c.goal,
          publico: c.publico,
          territorio: c.territorio,
          coop: c.coop,
          startDate: c.startDate,
          endDate: c.endDate,
          notes: c.notes,
        }}
      />
    </div>
  );
}
