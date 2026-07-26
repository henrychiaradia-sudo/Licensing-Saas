import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { RequisitionForm } from "../req-form";

export default async function NewRequisitionPage() {
  await requireSession();
  return (
    <div>
      <Link
        href="/requisicoes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Requisições de Compra
      </Link>
      <h1 className="mb-1 text-xl font-bold">Nova requisição</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Solicite itens para compra. Após criar, envie para aprovação.
      </p>
      <RequisitionForm />
    </div>
  );
}
