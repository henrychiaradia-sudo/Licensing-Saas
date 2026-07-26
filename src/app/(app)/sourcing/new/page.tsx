import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listCategoryOptions } from "@/lib/data/sourcing";
import { EventForm } from "../event-form";

export default async function NewSourcingPage() {
  const session = await requireSession();
  const categories = await listCategoryOptions(session.tenantId);

  return (
    <div>
      <Link
        href="/sourcing"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Sourcing &amp; Cotações
      </Link>
      <h1 className="mb-1 text-xl font-bold">Novo RFQ</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Abra um evento de cotação e registre as propostas dos fornecedores
      </p>
      <EventForm categories={categories.map((c) => ({ id: c.id, label: c.name }))} />
    </div>
  );
}
