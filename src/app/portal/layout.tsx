import Link from "next/link";
import { redirect } from "next/navigation";
import { requireLicenseeSession, logout } from "@/lib/auth";
import { getLicenseeName } from "@/lib/data/portal";
import { portalAlertCount } from "@/lib/data/portal-insights";
import { PortalNav, PortalNavMobile } from "./nav";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { initials } from "@/lib/utils";
import { LogOut, Bell } from "lucide-react";

async function logoutAction() {
  "use server";
  await logout();
  redirect("/login");
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireLicenseeSession();
  const lic = await getLicenseeName(session.tenantId, session.licenseeId);
  const licName = lic?.tradeName ?? lic?.legalName ?? "Licenciado";
  const alerts = await portalAlertCount(session.tenantId, session.licenseeId);

  return (
    <div className="flex min-h-screen">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-emerald-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-2.5 px-5 py-4 text-[15px] font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
            P
          </span>
          Portal <span className="font-medium text-neutral-400">Licenciado</span>
        </div>
        <PortalNav />
        <div className="border-t border-neutral-200 px-5 py-3 text-[11.5px] text-neutral-400 dark:border-neutral-800">
          {licName}
          <br />
          ALIANZA · Portal
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-neutral-200 bg-white/90 px-5 py-2.5 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
          <PortalNavMobile />
          <div className="text-sm font-semibold">{licName}</div>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/portal/notificacoes"
              aria-label="Notificações"
              title="Notificações"
              className="relative grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 text-neutral-500 hover:border-emerald-400 hover:text-emerald-600 dark:border-neutral-700"
            >
              <Bell size={16} />
              {alerts > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                  {alerts > 9 ? "9+" : alerts}
                </span>
              )}
            </Link>
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 text-xs font-bold text-white">
                {initials(session.name)}
              </div>
              <div className="hidden text-right sm:block">
                <div className="text-xs font-semibold leading-none">{session.name}</div>
                <div className="text-[11px] text-neutral-400">{session.email}</div>
              </div>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Sair"
                title="Sair"
                className="grid h-9 w-9 place-items-center rounded-lg border border-neutral-200 text-neutral-500 hover:border-red-400 hover:text-red-600 dark:border-neutral-700"
              >
                <LogOut size={16} />
              </button>
            </form>
          </div>
        </header>
        <main id="conteudo" className="mx-auto w-full max-w-[1200px] flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
