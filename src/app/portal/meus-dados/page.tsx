import Link from "next/link";
import { ShieldCheck, UserCheck, Building2, Download, Mail } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { getSubjectData } from "@/lib/data/privacy";
import { Card, Badge } from "@/components/ui";
import { fmtDate } from "@/lib/utils";
import { DPO } from "@/lib/support";
import { DataExportButton } from "./data-export-button";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="font-medium text-neutral-800 dark:text-neutral-100">{value ?? "—"}</dd>
    </div>
  );
}

export default async function PortalMeusDadosPage() {
  const session = await requireLicenseeSession();
  const data = await getSubjectData(session);
  const t = data.titular;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <UserCheck size={20} className="text-emerald-600" /> Meus Dados
        </h1>
        <p className="text-sm text-neutral-500">
          Acesso e portabilidade dos seus dados pessoais, conforme a LGPD (art. 18).
        </p>
      </div>

      <Card className="mb-4 p-5">
        <h2 className="mb-3 text-sm font-semibold">Dados de acesso</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <Field label="Nome" value={t?.nome} />
          <Field label="E-mail" value={t?.email} />
          <Field label="Perfil" value={data.perfil} />
          <Field label="Status" value={<Badge tone={t?.status === "ativo" ? "good" : "neutral"}>{t?.status}</Badge>} />
          <Field label="2FA (dupla etapa)" value={t?.duasEtapas ? "Ativado" : "Não ativado"} />
          <Field label="Último acesso" value={t?.ultimoAcesso ? fmtDate(t.ultimoAcesso) : "—"} />
          <Field label="Conta criada em" value={t?.criadoEm ? fmtDate(t.criadoEm) : "—"} />
        </dl>
      </Card>

      {data.vinculo && (
        <Card className="mb-4 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Building2 size={16} className="text-emerald-500" /> Empresa vinculada ({String(data.vinculo.tipo)})
          </h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            {Object.entries(data.vinculo)
              .filter(([k]) => k !== "tipo")
              .map(([k, v]) => (
                <Field key={k} label={k} value={v == null ? "—" : String(v)} />
              ))}
          </dl>
        </Card>
      )}

      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Download size={16} className="text-emerald-500" /> Portabilidade
          </h2>
          <p className="mt-0.5 text-[13px] text-neutral-500">
            Baixe uma cópia dos seus dados em formato aberto (JSON).
          </p>
        </div>
        <DataExportButton data={data} filename={`meus-dados-${t?.id ?? "titular"}.json`} />
      </Card>

      <Card className="p-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck size={16} className="text-emerald-500" /> Seus direitos (LGPD)
        </h2>
        <p className="mb-3 text-[13px] text-neutral-500">
          Como titular, você pode solicitar a qualquer momento: acesso, correção, anonimização, bloqueio, eliminação de
          dados desnecessários, portabilidade e informação sobre compartilhamentos.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <a
            href={`mailto:${DPO.email}?subject=${encodeURIComponent("Solicitação LGPD — titular de dados (Portal)")}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
          >
            <Mail size={15} /> Solicitar ao encarregado (DPO)
          </a>
          <Link href="/privacidade" className="text-emerald-700 hover:underline dark:text-emerald-400">
            Ler a Política de Privacidade
          </Link>
        </div>
        <p className="mt-3 text-[11.5px] text-neutral-400">Encarregado: {DPO.name} · {DPO.email}</p>
      </Card>
    </div>
  );
}
