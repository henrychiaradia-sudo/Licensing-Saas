"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Bell,
  Users,
  Star,
  FileText,
  Coins,
  Landmark,
  ClipboardCheck,
  Images,
  ShieldCheck,
  ShoppingCart,
  Factory,
  Scale,
  ScrollText,
  BarChart3,
  ClipboardList,
  Microscope,
  Truck,
  Target,
  Megaphone,
  Package,
  FolderTree,
  ListTodo,
  Gavel,
  FileSignature,
  KeyRound,
  Lock,
  Boxes,
  Calculator,
  Banknote,
  Wallet,
  BadgeCheck,
  FileCheck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AlianzaLogo } from "@/components/logo";

type NavItem = { href: string; label: string; icon: LucideIcon };
type NavGroup = { title: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    title: "Operação",
    items: [
      { href: "/dashboard", label: "Dashboard Executivo", icon: LayoutGrid },
      { href: "/pendencias", label: "Pendências", icon: Bell },
      { href: "/tarefas", label: "Cronogramas & Tarefas", icon: ListTodo },
      { href: "/pipeline", label: "Pipeline (CRM)", icon: Target },
      { href: "/licenciados", label: "Licenciados", icon: Users },
      { href: "/contratos", label: "Contratos", icon: FileText },
      { href: "/marcas", label: "Marcas & IP", icon: Star },
      { href: "/produtos", label: "Aprovação de Produtos", icon: ClipboardCheck },
      { href: "/royalties", label: "Royalties", icon: Coins },
      { href: "/financeiro", label: "Financeiro", icon: Landmark },
      { href: "/biblioteca", label: "Biblioteca Digital", icon: Images },
    ],
  },
  {
    title: "Comercial & Catálogo",
    items: [
      { href: "/marketing", label: "Marketing", icon: Megaphone },
      { href: "/catalogo", label: "Catálogo (SKU)", icon: Package },
      { href: "/categorias", label: "Categorias", icon: FolderTree },
    ],
  },
  {
    title: "Suprimentos",
    items: [
      { href: "/fornecedores", label: "Fornecedores", icon: Factory },
      { href: "/categorias-compras", label: "Categorias de Compras", icon: Boxes },
      { href: "/budget", label: "Budget de Compras", icon: Wallet },
      { href: "/requisicoes", label: "Requisições", icon: ClipboardList },
      { href: "/aprovacoes", label: "Aprovações", icon: BadgeCheck },
      { href: "/compras", label: "Pedidos de Compra", icon: ShoppingCart },
      { href: "/contratos-compra", label: "Contratos de Compra", icon: FileCheck },
      { href: "/sourcing", label: "Sourcing & Cotações", icon: Scale },
      { href: "/custos", label: "Gestão de Custos", icon: Calculator },
      { href: "/cambio", label: "Gestão Cambial", icon: Banknote },
      { href: "/logistica", label: "Logística", icon: Truck },
      { href: "/contratos-fornecimento", label: "Contratos de Forn.", icon: FileSignature },
    ],
  },
  {
    title: "Governança & BI",
    items: [
      { href: "/compliance", label: "Compliance & Riscos", icon: ShieldCheck },
      { href: "/juridico", label: "Jurídico", icon: Gavel },
      { href: "/qualidade", label: "Qualidade", icon: Microscope },
      { href: "/auditoria", label: "Auditoria", icon: ScrollText },
      { href: "/acessos", label: "Perfis & Acessos", icon: KeyRound },
      { href: "/seguranca", label: "Segurança", icon: Lock },
      { href: "/bi", label: "BI & Analytics", icon: BarChart3 },
    ],
  },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex dark:border-neutral-800 dark:bg-neutral-900">
      <div className="px-5 py-4">
        <AlianzaLogo tileSize={32} wordClassName="text-[15px]" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              {group.title}
            </p>
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = path === href || path.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium",
                    active
                      ? "bg-blue-600 text-white"
                      : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800",
                  )}
                >
                  <Icon size={18} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-neutral-200 px-5 py-3 text-[11.5px] text-neutral-400 dark:border-neutral-800">
        NovaSport Global · Demo
        <br />
        ALIANZA · Brand Licensing Platform
      </div>
    </aside>
  );
}
