import Link from "next/link";
import { ShieldCheck, KeyRound, Users, ChevronRight } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { listRoles, accessSummary } from "@/lib/data/access";
import { Card, Badge } from "@/components/ui";

export default async function AcessosPage() {
  const session = await requireSession();
  const [roles, summary] = await Promise.all([
    listRoles(session.tenantId),
    accessSummary(session.tenantId),
  ]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Perfis &amp; Permissões</h1>
        <p className="text-sm text-neutral-500">
          Controle de acesso baseado em papéis (RBAC) — quem pode fazer o quê
        </p>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Kpi label="Perfis" value={String(summary.roles)} icon={<ShieldCheck size={16} className="text-blue-500" />} />
        <Kpi label="Permissões" value={String(summary.permissions)} icon={<KeyRound size={16} className="text-emerald-500" />} />
        <Kpi label="Usuários internos" value={String(summary.internalUsers)} icon={<Users size={16} className="text-neutral-400" />} />
      </div>

      <Card className="overflow-hidden">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-[11px] uppercase tracking-wide text-neutral-400 dark:border-neutral-800">
              <th className="px-5 py-3 font-medium">Perfil</th>
              <th className="px-5 py-3 font-medium">Código</th>
              <th className="px-5 py-3 text-center font-medium">Permissões</th>
              <th className="px-5 py-3 text-center font-medium">Usuários</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => (
              <tr key={r.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/40">
                <td className="px-5 py-3">
                  <Link href={`/acessos/${r.id}`} className="font-medium text-blue-600 hover:underline">
                    {r.name}
                  </Link>
                  {r.description && <div className="text-[11px] text-neutral-400">{r.description}</div>}
                </td>
                <td className="px-5 py-3">
                  <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[11px] text-neutral-500 dark:bg-neutral-800">
                    {r.code}
                  </code>
                </td>
                <td className="px-5 py-3 text-center">
                  <Badge tone={r.permCount > 0 ? "info" : "neutral"}>{r.permCount}</Badge>
                </td>
                <td className="px-5 py-3 text-center tabular-nums text-neutral-500">{r.userCount}</td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/acessos/${r.id}`} className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-blue-600">
                    Gerenciar <ChevronRight size={14} />
                  </Link>
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-sm text-neutral-400">
                  Nenhum perfil cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Kpi({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-neutral-500">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums">{value}</div>
    </Card>
  );
}
