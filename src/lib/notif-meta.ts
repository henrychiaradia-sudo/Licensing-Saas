// Fase 48 — metadados dos eventos de notificação (puro, sem React).
// Compartilhado entre a camada de dados, as server actions e as telas.

export type NotifTone = "good" | "info" | "neutral" | "warn" | "danger";
export type NotifChannel = "inApp" | "email" | "webhook" | "push";

export const NOTIF_LABEL: Record<string, string> = {
  approval_pending: "Aprovação pendente",
  approval_rejected: "Reprovação",
  document_expiring: "Documento vencendo",
  contract_expiring: "Contrato vencendo",
  report_late: "Reporte atrasado",
  receivable_overdue: "Pagamento vencido",
  product_review_pending: "Produto aguardando revisão",
  purchase_order_late: "Pedido atrasado",
  sourcing_closing: "Cotação encerrando",
  supplier_high_risk: "Fornecedor com risco elevado",
  quality_nc: "Não conformidade",
  sla_breached: "SLA vencido",
  task_overdue: "Tarefa atrasada",
  legal_deadline: "Prazo jurídico",
  system: "Sistema",
};

export const NOTIF_BLURB: Record<string, string> = {
  approval_pending: "Requisições e pedidos aguardando decisão de alçada.",
  approval_rejected: "Requisições reprovadas nas últimas duas semanas.",
  document_expiring: "Documentos de fornecedor com validade próxima do fim.",
  contract_expiring: "Contratos de licenciamento com vigência a expirar.",
  report_late: "Reportes de royalties com período encerrado sem envio.",
  receivable_overdue: "Recebíveis vencidos e ainda não liquidados.",
  product_review_pending: "Aprovações de produto pendentes de revisão.",
  purchase_order_late: "Pedidos de compra além da data prevista de entrega.",
  sourcing_closing: "Processos de sourcing perto do prazo de propostas.",
  supplier_high_risk: "Fornecedores avaliados como risco alto ou crítico.",
  quality_nc: "Não conformidades críticas em aberto.",
  sla_breached: "Prazos de SLA (ex.: revisão de produto) estourados.",
  task_overdue: "Tarefas e cronogramas fora do prazo.",
  legal_deadline: "Prazos jurídicos se aproximando.",
  system: "Mensagens gerais do sistema.",
};

export const NOTIF_TONE: Record<string, NotifTone> = {
  approval_pending: "warn",
  approval_rejected: "danger",
  document_expiring: "warn",
  contract_expiring: "warn",
  report_late: "warn",
  receivable_overdue: "danger",
  product_review_pending: "warn",
  purchase_order_late: "warn",
  sourcing_closing: "warn",
  supplier_high_risk: "danger",
  quality_nc: "danger",
  sla_breached: "danger",
  task_overdue: "warn",
  legal_deadline: "warn",
  system: "info",
};

// Ordem exibida na tela de preferências (os 12 eventos do escopo primeiro).
export const NOTIF_PREF_ORDER: string[] = [
  "approval_pending",
  "approval_rejected",
  "document_expiring",
  "contract_expiring",
  "report_late",
  "receivable_overdue",
  "product_review_pending",
  "purchase_order_late",
  "sourcing_closing",
  "supplier_high_risk",
  "quality_nc",
  "sla_breached",
  "task_overdue",
  "legal_deadline",
];

export const NOTIF_CHANNELS: { key: NotifChannel; label: string; future?: boolean }[] = [
  { key: "inApp", label: "In-app" },
  { key: "email", label: "E-mail" },
  { key: "webhook", label: "Webhook" },
  { key: "push", label: "Push", future: true },
];

export const SEVERITY_LABEL: Record<string, string> = {
  info: "Informativo",
  warn: "Atenção",
  danger: "Urgente",
  success: "OK",
};
export const SEVERITY_TONE: Record<string, NotifTone> = {
  info: "info",
  warn: "warn",
  danger: "danger",
  success: "good",
};
