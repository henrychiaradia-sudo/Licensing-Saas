import { redirect } from "next/navigation";

// Compat: "nova campanha" migrou para /marketing/campanhas/nova.
export default function LegacyNewCampaignRedirect() {
  redirect("/marketing/campanhas/nova");
}
