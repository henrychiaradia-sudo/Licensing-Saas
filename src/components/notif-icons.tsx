import {
  FileText,
  Landmark,
  Microscope,
  ListTodo,
  Gavel,
  Bell,
  BadgeCheck,
  XCircle,
  FileWarning,
  FileClock,
  PackageCheck,
  Truck,
  Scale,
  ShieldAlert,
  Clock,
  type LucideIcon,
} from "lucide-react";

// Fase 48 — ícone por tipo de evento (componente de servidor, sem estado).
const ICONS: Record<string, LucideIcon> = {
  approval_pending: BadgeCheck,
  approval_rejected: XCircle,
  document_expiring: FileWarning,
  contract_expiring: FileText,
  report_late: FileClock,
  receivable_overdue: Landmark,
  product_review_pending: PackageCheck,
  purchase_order_late: Truck,
  sourcing_closing: Scale,
  supplier_high_risk: ShieldAlert,
  quality_nc: Microscope,
  sla_breached: Clock,
  task_overdue: ListTodo,
  legal_deadline: Gavel,
  system: Bell,
};

export function NotifIcon({
  type,
  size = 16,
  className,
}: {
  type: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[type] ?? Bell;
  return <Icon size={size} className={className} />;
}
