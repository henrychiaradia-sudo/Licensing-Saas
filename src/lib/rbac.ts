// Catálogo de permissões (RBAC). Os códigos batem com a tabela `permission` no banco.
export const PERMISSIONS = {
  licenseeRead: "licensee.read",
  licenseeWrite: "licensee.write",
  brandRead: "brand.read",
  brandWrite: "brand.write",
  contractRead: "contract.read",
  contractWrite: "contract.write",
  contractApprove: "contract.approve",
  royaltyRead: "royalty.read",
  royaltyValidate: "royalty.validate",
  royaltyApprove: "royalty.approve",
  financeRead: "finance.read",
  financeWrite: "finance.write",
  auditRead: "audit.read",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
