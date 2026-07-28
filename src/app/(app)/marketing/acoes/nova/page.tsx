import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listCampaigns } from "@/lib/data/marketing";
import { listAgencyOptions, listInfluencerOptions } from "@/lib/data/marketing-registry";
import { ActionForm } from "../action-form";
import { createActionAction } from "../../actions";

export default async function NewActionPage({
  searchParams,
}: {
  searchParams: Promise<{ campaignId?: string }>;
}) {
  const sp = await searchParams;
  const session = await requireSession();
  const [campaigns, agencies, influencers] = await Promise.all([
    listCampaigns(session.tenantId),
    listAgencyOptions(session.tenantId),
    listInfluencerOptions(session.tenantId),
  ]);

  return (
    <div>
      <Link
        href="/marketing/acoes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Ações
      </Link>
      <h1 className="mb-1 text-xl font-bold">Nova ação</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Registre a tática, verba, evidência e resultado. Se vincular a uma campanha, o realizado é somado a ela.
      </p>
      <ActionForm
        action={createActionAction}
        campaigns={campaigns.map((c) => ({ id: c.id, label: `${c.campaignNumber} · ${c.name}` }))}
        agencies={agencies.map((a) => ({ id: a.id, label: a.name }))}
        influencers={influencers.map((i) => ({ id: i.id, label: i.handle ? `${i.name} (${i.handle})` : i.name }))}
        defaults={{ campaignId: sp.campaignId ?? null }}
      />
    </div>
  );
}
