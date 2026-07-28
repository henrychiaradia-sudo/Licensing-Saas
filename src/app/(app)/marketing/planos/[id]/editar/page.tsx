import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getPlanDetail } from "@/lib/data/marketing-plans";
import { listBrandOptions } from "@/lib/data/contracts";
import { listLicensees } from "@/lib/data/licensees";
import { PlanForm } from "../../plan-form";
import { updatePlanAction } from "../../../actions";

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const data = await getPlanDetail(session.tenantId, id);
  if (!data) notFound();
  const p = data.plan;
  const [brands, licensees] = await Promise.all([
    listBrandOptions(session.tenantId),
    listLicensees(session.tenantId),
  ]);

  return (
    <div>
      <Link
        href={`/marketing/planos/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> {p.name}
      </Link>
      <h1 className="mb-6 text-xl font-bold">Editar plano</h1>
      <PlanForm
        action={updatePlanAction.bind(null, id)}
        submitLabel="Salvar alterações"
        brands={brands.map((b) => ({ id: b.id, label: `${b.name} (${b.code})` }))}
        licensees={licensees.map((l) => ({ id: l.id, label: l.tradeName ?? l.legalName }))}
        defaults={{
          name: p.name,
          year: p.year,
          brandId: p.brandId,
          licenseeId: p.licenseeId,
          objetivo: p.objetivo,
          publico: p.publico,
          territorio: p.territorio,
          budget: p.budget,
          status: p.status,
          startDate: p.startDate,
          endDate: p.endDate,
          notes: p.notes,
        }}
      />
    </div>
  );
}
