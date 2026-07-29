// Catálogo de permissões (RBAC). Os códigos batem com a tabela `permission` no banco.
export const PERMISSIONS = {
  // Acessos / governança
  accessRead: "access.read",
  accessWrite: "access.write",
  auditRead: "audit.read",
  reportRead: "report.read",

  // Licenciamento
  licenseeRead: "licensee.read",
  licenseeWrite: "licensee.write",
  brandRead: "brand.read",
  brandWrite: "brand.write",
  contractRead: "contract.read",
  contractWrite: "contract.write",
  contractApprove: "contract.approve",
  opportunityRead: "opportunity.read",
  opportunityWrite: "opportunity.write",

  // Royalties
  royaltyRead: "royalty.read",
  royaltySubmit: "royalty.submit",
  royaltyValidate: "royalty.validate",
  royaltyApprove: "royalty.approve",

  // Financeiro
  financeRead: "finance.read",
  financeWrite: "finance.write",

  // Produtos / catálogo / categorias
  productRead: "product.read",
  productWrite: "product.write",
  productApprove: "product.approve",
  catalogRead: "catalog.read",
  catalogWrite: "catalog.write",
  categoryRead: "category.read",
  categoryWrite: "category.write",

  // Suprimentos (compras, requisições, sourcing, fornecedores, logística)
  purchaseRead: "purchase.read",
  purchaseWrite: "purchase.write",
  purchaseApprove: "purchase.approve",
  requisitionRead: "requisition.read",
  requisitionWrite: "requisition.write",
  requisitionApprove: "requisition.approve",
  sourcingRead: "sourcing.read",
  sourcingWrite: "sourcing.write",
  sourcingAward: "sourcing.award",
  supplierRead: "supplier.read",
  supplierWrite: "supplier.write",
  supplierApprove: "supplier.approve",
  shipmentRead: "shipment.read",
  shipmentWrite: "shipment.write",

  // Qualidade / jurídico / marketing / tarefas
  qualityRead: "quality.read",
  qualityWrite: "quality.write",
  legalRead: "legal.read",
  legalWrite: "legal.write",
  marketingRead: "marketing.read",
  marketingWrite: "marketing.write",
  taskRead: "task.read",
  taskWrite: "task.write",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
