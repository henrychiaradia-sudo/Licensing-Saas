import { requireSession, logout } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/sidebar";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { initials } from "@/lib/utils";
import { LogOut, Search } from "lucide-react";

async function logoutAction() {
  "use server";
  await logout();
  redirect("/login");
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();
  if (session.licenseeId) redirect("/portal");
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-neutral-200 bg-white/90 px-5 py-2.5 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
          <form
            action="/busca"
            className="hidden items-center gap-2 rounded-lg border border-neutral-200 px-3 py-1.5 text-neutral-400 sm:flex dark:border-neutral-700"
          >
            <Search size={15} />
            <input
              name="q"
              placeholder="Buscar contratos, produtos, fornecedores…"
              className="w-64 bg-transparent text-sm text-neutral-800 outline-none dark:text-neutral-100"
            />
          </form>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-500 text-xs font-bold text-white">
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
        <main className="mx-auto w-full max-w-[1400px] flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
