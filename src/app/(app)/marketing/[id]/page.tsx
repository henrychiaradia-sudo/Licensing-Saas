import { redirect } from "next/navigation";

// Compat: as campanhas migraram para /marketing/campanhas/[id].
export default async function LegacyCampaignRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/marketing/campanhas/${id}`);
}
