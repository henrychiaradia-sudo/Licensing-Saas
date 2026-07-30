import Link from "next/link";
import { Bell, AlertTriangle, Info, CheckCircle2, ArrowRight } from "lucide-react";
import { requireLicenseeSession } from "@/lib/auth";
import { portalAlerts } from "@/lib/data/portal-insights";
import { Card } from "@/components/ui";

type Sev = "info" | "warn" | "danger" | "success";
const ICON: Record<Sev, React.ReactNode> = {
  danger: <AlertTriangle size={16} className="text-red-500" />,
  warn: <AlertTriangle size={16} className="text-amber-500" />,
  info: <Info size={16} className="text-blue-500" />,
  success: <CheckCircle2 size={16} className="text-emerald-500" />,
};

export default async function PortalNotificacoesPage() {
  const session = await requireLicenseeSession();
  const alerts = await portalAlerts(session.tenantId, session.licenseeId);

  return (
    <div>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <Bell size={20} className="text-emerald-600" /> Notificações
        </h1>
        <p className="text-sm text-neutral-500">
          Avisos gerados a partir dos seus dados — {alerts.length} no momento.
        </p>
      </div>

      {alerts.length === 0 ? (
        <Card className="p-10 text-center text-sm text-neutral-400">
          <Bell size={28} className="mx-auto mb-3 text-neutral-300" />
          Nenhum aviso no momento. Está tudo em dia por aqui.
        </Card>
      ) : (
        <Card className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {alerts.map((a, i) => (
            <div key={i} className="flex items-start gap-3 p-4">
              <div className="mt-0.5">{ICON[a.severity]}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">{a.title}</div>
                <p className="mt-0.5 text-sm text-neutral-500">{a.body}</p>
                <Link
                  href={a.link}
                  className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                >
                  Resolver <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
