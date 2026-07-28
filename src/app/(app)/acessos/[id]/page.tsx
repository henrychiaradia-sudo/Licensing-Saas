import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Plus, X, ShieldCheck, Users } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getRoleDetail, listPermissions, listInternalUsers } from "@/lib/data/access";
import { toggleRolePermissionAction, toggleUserRoleAction } from "../actions";
import { Card, Badge } from "@/components/ui";
import { initials } from "@/lib/utils";

const areaLabel: Record<string, string> = {
  contract: "Contratos",
  royalty: "Royalties",
  finance: "Financeiro",
  licensee: "Licenciados",
  brand: "Marcas & IP",
  audit: "Auditoria",
  supplier: "Fornecedores",
  purchase: "Compras",
  quality: "Qualidade",
  marketing: "Marketing",
  catalog: "Catálogo",
  legal: "Jurídico",
  access: "Acessos",
  report: "Relatórios",
};

function areaOf(code: string): string {
  const prefix = code.split(".")[0] ?? code;
  return areaLabel[prefix] ?? prefix;
}

export default async function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const [detail, allPermissions, users] = await Promise.all([
    getRoleDetail(session.tenantId, id),
    listPermissions(),
    listInternalUsers(session.tenantId),
  ]);
  if (!detail) notFound();
  const { role: r, permissionIds, members } = detail;
  const memberIds = new Set(members.map((m) => m.userId));

  // Agrupa permissões por área.
  const groups = new Map<string, typeof allPermissions>();
  for (const p of allPermissions) {
    const area = areaOf(p.code);
    if (!groups.has(area)) groups.set(area, []);
    groups.get(area)!.push(p);
  }

  return (
    <div>
      <Link
        href="/acessos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-blue-600"
      >
        <ArrowLeft size={15} /> Perfis &amp; Permissões
      </Link>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{r.name}</h1>
          <p className="text-sm text-neutral-500">
            <code className="font-mono">{r.code}</code>
            {r.description ? ` · ${r.description}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="info">{permissionIds.size} permissões</Badge>
          <Badge tone="neutral">{members.length} usuários</Badge>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck size={16} className="text-blue-500" /> Permissões do perfil
          </h2>
          <p className="mb-4 text-xs text-neutral-500">Clique para conceder ou remover cada permissão.</p>
          <div className="space-y-5">
            {[...groups.entries()].map(([area, perms]) => (
              <div key={area}>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{area}</div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {perms.map((p) => {
                    const on = permissionIds.has(p.id);
                    return (
                      <form
                        key={p.id}
                        action={toggleRolePermissionAction.bind(null, r.id, p.id)}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="on" value={on ? "false" : "true"} />
                        <button
                          type="submit"
                          aria-label={on ? "Remover permissão" : "Conceder permissão"}
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded border transition-colors ${
                            on
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-neutral-300 bg-white hover:border-blue-400 dark:border-neutral-600 dark:bg-neutral-900"
                          }`}
                        >
                          {on && <Check size={13} />}
                        </button>
                        <span className={`text-sm ${on ? "font-medium" : "text-neutral-500"}`}>
                          {p.description ?? p.code}
                        </span>
                      </form>
                    );
                  })}
                </div>
              </div>
            ))}
            {allPermissions.length === 0 && (
              <p className="text-sm text-neutral-400">Nenhuma permissão cadastrada.</p>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold">
            <Users size={16} className="text-emerald-500" /> Usuários neste perfil
          </h2>
          <p className="mb-4 text-xs text-neutral-500">Atribua ou remova usuários internos.</p>
          <ul className="space-y-1.5">
            {users.map((u) => {
              const inRole = memberIds.has(u.id);
              return (
                <li key={u.id} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-500 text-[10px] font-bold text-white">
                      {initials(u.name)}
                    </span>
                    <span>
                      <span className="block text-sm font-medium leading-tight">{u.name}</span>
                      <span className="block text-[11px] text-neutral-400">{u.email}</span>
                    </span>
                  </span>
                  <form action={toggleUserRoleAction.bind(null, r.id, u.id)}>
                    <input type="hidden" name="on" value={inRole ? "false" : "true"} />
                    <button
                      type="submit"
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition-colors ${
                        inRole
                          ? "border-neutral-200 text-neutral-500 hover:border-red-400 hover:text-red-600 dark:border-neutral-700"
                          : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {inRole ? (
                        <>
                          <X size={12} /> Remover
                        </>
                      ) : (
                        <>
                          <Plus size={12} /> Atribuir
                        </>
                      )}
                    </button>
                  </form>
                </li>
              );
            })}
            {users.length === 0 && <li className="text-sm text-neutral-400">Nenhum usuário interno.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
