import { ShieldCheck, KeyRound, Clock, Activity, LogIn, Lock, ShieldOff, ShieldPlus } from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getSecurityOverview, listSecurityEvents } from "@/lib/data/security";
import { MfaSetup } from "./mfa-setup";
import { PasswordForm } from "./password-form";
import { Card, Badge } from "@/components/ui";

const eventLabel: Record<string, string> = {
  "security.login": "Acesso realizado",
  "security.lockout": "Conta bloqueada (tentativas)",
  "security.mfa_enabled": "2FA ativado",
  "security.mfa_disabled": "2FA desativado",
  "security.password_change": "Senha alterada",
};
const eventIcon: Record<string, React.ReactNode> = {
  "security.login": <LogIn size={14} className="text-emerald-500" />,
  "security.lockout": <Lock size={14} className="text-red-500" />,
  "security.mfa_enabled": <ShieldPlus size={14} className="text-blue-500" />,
  "security.mfa_disabled": <ShieldOff size={14} className="text-amber-500" />,
  "security.password_change": <KeyRound size={14} className="text-blue-500" />,
};

function fmtDateTime(d: Date | string | null) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function summaryText(changes: unknown): string {
  if (changes && typeof changes === "object" && "summary" in changes) {
    const s = (changes as { summary?: unknown }).summary;
    if (typeof s === "string") return s;
  }
  return "";
}

export default async function SegurancaPage() {
  const session = await requireSession();
  const [overview, events] = await Promise.all([
    getSecurityOverview(session.userId),
    listSecurityEvents(session.tenantId, session.userId),
  ]);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-xl font-bold">Segurança da conta</h1>
        <p className="text-sm text-neutral-500">Autenticação em duas etapas, senha e atividade recente</p>
      </div>

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">2FA</span>
            <ShieldCheck size={16} className={overview?.mfaEnabled ? "text-emerald-500" : "text-neutral-400"} />
          </div>
          <div className="mt-3">
            {overview?.mfaEnabled ? <Badge tone="good">Ativo</Badge> : <Badge tone="neutral">Inativo</Badge>}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Último acesso</span>
            <Clock size={16} className="text-blue-500" />
          </div>
          <div className="mt-3 text-sm font-semibold tabular-nums">{fmtDateTime(overview?.lastLoginAt ?? null)}</div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-neutral-500">Senha alterada em</span>
            <KeyRound size={16} className="text-neutral-400" />
          </div>
          <div className="mt-3 text-sm font-semibold tabular-nums">
            {overview?.passwordUpdatedAt ? fmtDateTime(overview.passwordUpdatedAt) : "—"}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck size={16} className="text-emerald-500" /> Autenticação em duas etapas (2FA)
          </h2>
          <MfaSetup enabled={!!overview?.mfaEnabled} />
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <KeyRound size={16} className="text-blue-500" /> Alterar senha
          </h2>
          <PasswordForm />
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Activity size={16} className="text-neutral-500" /> Atividade de segurança recente
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-neutral-400">Nenhum evento de segurança registrado ainda.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="flex items-center gap-2">
                  {eventIcon[e.action] ?? <Activity size={14} className="text-neutral-400" />}
                  <span className="font-medium">{eventLabel[e.action] ?? e.action}</span>
                  {summaryText(e.changes) && (
                    <span className="hidden text-xs text-neutral-400 sm:inline">· {summaryText(e.changes)}</span>
                  )}
                </span>
                <span className="flex items-center gap-3 text-xs text-neutral-400">
                  {e.actorIp && <span className="tabular-nums">IP {e.actorIp}</span>}
                  <span className="tabular-nums">{fmtDateTime(e.occurredAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
