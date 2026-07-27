import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listBrandOptions } from "@/lib/data/contracts";
import { listSegments } from "@/lib/data/licensees";
import { listOwnerOptions } from "@/lib/data/opportunities";
import { OpportunityForm } from "../opportunity-form";

export default async function NewOpportunityPage() {
  const session = await requireSession();
  const [brands, segments, owners] = await Promise.all([
    listBrandOptions(session.tenantId),
    listSegments(session.tenantId),
    listOwnerOptions(session.tenantId),
  ]);

  return (
    <div>
      <Link
        href="/pipeline"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Pipeline de Licenciamento
      </Link>
      <h1 className="mb-1 text-xl font-bold">Nova oportunidade</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Registre uma prospecção de novo licenciado e acompanhe pelo funil.
      </p>
      <OpportunityForm
        brands={brands.map((b) => ({ id: b.id, label: `${b.name} (${b.code})` }))}
        segments={segments.map((s) => ({ id: s.id, label: s.name }))}
        owners={owners.map((o) => ({ id: o.id, label: o.name }))}
      />
    </div>
  );
}
