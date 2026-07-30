import { Lock, ShieldCheck, ShieldAlert, Clock, KeyRound, CalendarClock } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { portalAccountSecurity } from "@/lib/data/portal-insights";
import { Card, Badge } from "@/components/ui";
import { SUPPORT, whatsappLink } from "@/lib/support";
import { WhatsappIcon } from "@/components/whatsapp-button";

function fmtWhen(s: string | null) {
  if (!s) return "—";
  const d = new Date(s.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Row({ icon, label, value, badge }: { icon: React.ReactNode; label: string; value: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] text-neutral-400">{label}</div>
        <div className="flex items-center gap-2 text-sm font-medium">
          {value} {badge}
        </div>
      </div>
    </div>
  );
}

export default async function PortalSegurancaPage() {
  const session = await requireLicenseeSession();
  const s = await portalAccountSecurity(session.tenantId, session.userId);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Lock size={20} className="text-emerald-600" /> Segurança da conta
        </h1>
        <p className="text-sm text-neutral-500">Estado de segurança do seu acesso ao portal.</p>
      </div>

      <Card className="divide-y divide-neutral-100 p-5 dark:divide-neutral-800">
        <Row
          icon={s?.mfaEnabled ? <ShieldCheck size={16} className="text-emerald-500" /> : <ShieldAlert size={16} className="text-amber-500" />}
          label="Autenticação em duas etapas (2FA)"
          value={s?.mfaEnabled ? "Ativada" : "Não ativada"}
          badge={
            <Badge tone={s?.mfaEnabled ? "good" : "warn"}>
              {s?.mfaEnabled ? "Protegido" : "Recomendado ativar"}
            </Badge>
          }
        />
        <Row icon={<Clock size={16} />} label="Último acesso" value={fmtWhen(s?.lastLoginAt ?? null)} />
        <Row icon={<KeyRound size={16} />} label="Senha atualizada em" value={fmtWhen(s?.passwordUpdatedAt ?? null)} />
        <Row icon={<CalendarClock size={16} />} label="Conta criada em" value={fmtWhen(s?.createdAt ?? null)} />
        <Row
          icon={<ShieldCheck size={16} />}
          label="Situação da conta"
          value={s?.status ?? "—"}
          badge={<Badge tone={s?.status === "ativo" ? "good" : "neutral"}>{s?.status}</Badge>}
        />
      </Card>

      <Card className="mt-4 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-sm font-semibold">Precisa alterar senha ou ativar o 2FA?</h2>
          <p className="mt-0.5 text-[13px] text-neutral-500">
            Nossa equipe ajuda você a reforçar a segurança do seu acesso.
          </p>
        </div>
        <a
          href={whatsappLink("Olá! Preciso de ajuda com a segurança do meu acesso ao Portal ALIANZA.")}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <WhatsappIcon size={15} /> Falar com o suporte
        </a>
      </Card>
      <p className="mt-3 text-center text-[11.5px] text-neutral-400">Suporte: {SUPPORT.email}</p>
    </div>
  );
}
