import { redirect } from "next/navigation";
import { requireSupplierSession, logout } from "@/lib/auth";
import { getSupplierName } from "@/lib/data/supplier-portal";
import { SupplierNav, SupplierNavMobile } from "./nav";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { initials } from "@/lib/utils";
import { LogOut } from "lucide-react";

async function logoutAction() {
  "use server";
  await logout();
  redirect("/login");
}

export default async function SupplierPortalLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSupplierSession();
  const sup = await getSupplierName(session.tenantId, session.supplierId);
  const supName = sup?.tradeName ?? sup?.legalName ?? "Fornecedor";

  return (
    <div className="flex min-h-screen">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-2.5 px-5 py-4 text-[15px] font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 text-white">
            F
          </span>
          Portal <span className="font-medium text-neutral-400">Fornecedor</span>
        </div>
        <SupplierNav />
        <div className="border-t border-neutral-200 px-5 py-3 text-[11.5px] text-neutral-400 dark:border-neutral-800">
          {supName}
          <br />
          ALIANZA · Portal
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-neutral-200 bg-white/90 px-5 py-2.5 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
          <SupplierNavMobile />
          <div className="text-sm font-semibold">{supName}</div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-500 text-xs font-bold text-white">
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
        <main id="conteudo" className="mx-auto w-full max-w-[1100px] flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
