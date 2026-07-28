import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  char,
  integer,
  bigint,
  date,
  jsonb,
  pgEnum,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";

/* ------------------------- Enums (já existem no Postgres) ------------------------- */
export const licenseeStatus = pgEnum("licensee_status", [
  "em_negociacao",
  "ativo",
  "inativo",
  "suspenso",
  "encerrado",
]);
export const riskRating = pgEnum("risk_rating", ["baixo", "medio", "alto", "critico"]);
export const userStatus = pgEnum("user_status", ["ativo", "inativo", "bloqueado"]);

export type LicenseeStatus = (typeof licenseeStatus.enumValues)[number];
export type RiskRating = (typeof riskRating.enumValues)[number];
export type UserStatus = (typeof userStatus.enumValues)[number];

/* --------------------------------- Tabelas --------------------------------- */
export const tenant = pgTable("tenant", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  legalName: text("legal_name"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appUser = pgTable(
  "app_user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    isInternal: boolean("is_internal").notNull().default(true),
    licenseeId: uuid("licensee_id"),
    supplierId: uuid("supplier_id"),
    status: userStatus("status").notNull().default("ativo"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_user_email").on(t.tenantId, t.email)],
);

export const permission = pgTable("permission", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  description: text("description"),
});

export const role = pgTable(
  "role",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
  },
  (t) => [unique("uq_role_code").on(t.tenantId, t.code)],
);

export const rolePermission = pgTable(
  "role_permission",
  {
    roleId: uuid("role_id").notNull(),
    permissionId: uuid("permission_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const userRole = pgTable(
  "user_role",
  {
    userId: uuid("user_id").notNull(),
    roleId: uuid("role_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.roleId] })],
);

export const segment = pgTable(
  "segment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    name: text("name").notNull(),
  },
  (t) => [unique("uq_segment_name").on(t.tenantId, t.name)],
);

export const country = pgTable("country", {
  id: uuid("id").primaryKey().defaultRandom(),
  iso2: char("iso2", { length: 2 }).notNull().unique(),
  iso3: char("iso3", { length: 3 }).notNull().unique(),
  name: text("name").notNull(),
});

export const licensee = pgTable(
  "licensee",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    legalName: text("legal_name").notNull(),
    tradeName: text("trade_name"),
    taxId: text("tax_id"),
    countryId: uuid("country_id"),
    state: text("state"),
    city: text("city"),
    segmentId: uuid("segment_id"),
    website: text("website"),
    riskRating: riskRating("risk_rating"),
    financialScore: numeric("financial_score", { precision: 6, scale: 2 }),
    status: licenseeStatus("status").notNull().default("em_negociacao"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [unique("uq_licensee_tax").on(t.tenantId, t.taxId)],
);

/* =============================== FASE 2 =============================== */

/* ---- Marcas & IP ---- */
export const brandStatus = pgEnum("brand_status", ["ativo", "inativo", "descontinuado"]);
export type BrandStatus = (typeof brandStatus.enumValues)[number];

export const brand = pgTable(
  "brand",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    ownerArea: text("owner_area"),
    managerUserId: uuid("manager_user_id"),
    status: brandStatus("status").notNull().default("ativo"),
    language: text("language"),
    legalRestrictions: text("legal_restrictions"),
    validFrom: date("valid_from"),
    validTo: date("valid_to"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [unique("uq_brand_code").on(t.tenantId, t.code)],
);

/* ---- Aprovação de Produtos ---- */
export const productStatus = pgEnum("product_status", [
  "rascunho",
  "submetido",
  "em_aprovacao",
  "aprovado",
  "aprovado_com_ressalvas",
  "reprovado",
  "descontinuado",
]);
export const approvalStageType = pgEnum("approval_stage_type", [
  "produto",
  "marketing",
  "branding",
  "juridico",
  "compliance",
  "qualidade",
  "licensing",
  "diretoria",
]);
export const approvalDecision = pgEnum("approval_decision", [
  "pendente",
  "aprovado",
  "aprovado_com_ressalvas",
  "reprovado",
]);
export type ProductStatus = (typeof productStatus.enumValues)[number];
export type ApprovalStageType = (typeof approvalStageType.enumValues)[number];
export type ApprovalDecision = (typeof approvalDecision.enumValues)[number];

export const product = pgTable(
  "product",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    productLine: text("product_line"),
    categoryId: uuid("category_id"),
    brandId: uuid("brand_id").notNull(),
    licenseeId: uuid("licensee_id").notNull(),
    contractId: uuid("contract_id"),
    supplierName: text("supplier_name"),
    material: text("material"),
    color: text("color"),
    suggestedPrice: numeric("suggested_price", { precision: 18, scale: 4 }),
    barcode: text("barcode"),
    imageUrl: text("image_url"),
    status: productStatus("status").notNull().default("rascunho"),
    currentVersion: integer("current_version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [unique("uq_product_sku").on(t.tenantId, t.sku)],
);

export const productApproval = pgTable(
  "product_approval",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    productId: uuid("product_id").notNull(),
    version: integer("version").notNull().default(1),
    status: productStatus("status").notNull().default("submetido"),
    overallDecision: approvalDecision("overall_decision").notNull().default("pendente"),
    submittedBy: uuid("submitted_by"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    slaDueDate: date("sla_due_date"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_product_approval_ver").on(t.productId, t.version)],
);

export const approvalStage = pgTable(
  "approval_stage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    productApprovalId: uuid("product_approval_id").notNull(),
    stageType: approvalStageType("stage_type").notNull(),
    sequence: integer("sequence").notNull(),
    assigneeUserId: uuid("assignee_user_id"),
    decision: approvalDecision("decision").notNull().default("pendente"),
    slaHours: integer("sla_hours"),
    comment: text("comment"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_stage_seq").on(t.productApprovalId, t.sequence)],
);

/* ---- Biblioteca Digital (DAM) ---- */
export const damAssetType = pgEnum("dam_asset_type", [
  "logo",
  "vetor",
  "psd",
  "ai",
  "png",
  "foto",
  "campanha",
  "video",
  "brand_book",
  "guia",
  "arquivo_juridico",
  "template",
]);
export const damAssetStatus = pgEnum("dam_asset_status", ["ativo", "arquivado", "restrito"]);
export type DamAssetType = (typeof damAssetType.enumValues)[number];

export const asset = pgTable("asset", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  brandId: uuid("brand_id"),
  categoryId: uuid("category_id"),
  assetType: damAssetType("asset_type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  fileUri: text("file_uri").notNull(),
  fileName: text("file_name"),
  mimeType: text("mime_type"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  currentVersion: integer("current_version").notNull().default(1),
  status: damAssetStatus("status").notNull().default("ativo"),
  tags: text("tags").array().notNull(),
  uploadedBy: uuid("uploaded_by"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const assetDownload = pgTable("asset_download", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  assetId: uuid("asset_id").notNull(),
  assetVersion: integer("asset_version"),
  downloadedBy: uuid("downloaded_by"),
  purpose: text("purpose"),
  downloadedAt: timestamp("downloaded_at", { withTimezone: true }).notNull().defaultNow(),
});

/* =============================== FASE 3 =============================== */
/* ---- Enums ---- */
export const contractStatus = pgEnum("contract_status", [
  "rascunho",
  "em_aprovacao",
  "vigente",
  "suspenso",
  "renovado",
  "expirado",
  "encerrado",
]);
export const exclusivityType = pgEnum("exclusivity_type", ["exclusivo", "nao_exclusivo"]);
export const feeType = pgEnum("fee_type", [
  "initial",
  "annual",
  "marketing",
  "renewal",
  "penalty",
  "other",
]);
export const alertType = pgEnum("alert_type", [
  "renovacao",
  "vencimento",
  "mg_shortfall",
  "pagamento_vencido",
  "documento_vencido",
]);
export const alertStatus = pgEnum("alert_status", ["agendado", "disparado", "resolvido", "ignorado"]);
export const contractDocType = pgEnum("contract_doc_type", [
  "contrato",
  "aditivo",
  "nda",
  "distrato",
  "anexo",
  "procuracao",
]);
export const royaltyReportStatus = pgEnum("royalty_report_status", [
  "rascunho",
  "enviado",
  "em_validacao",
  "com_divergencia",
  "aprovado",
  "rejeitado",
]);
export const reportSource = pgEnum("report_source", ["manual", "excel", "csv", "xml", "api", "erp"]);
export const validationSeverity = pgEnum("validation_severity", ["info", "warning", "error"]);
export const royaltyType = pgEnum("royalty_type", ["percentual", "fixo", "hibrido", "escalonado"]);
export const royaltyBase = pgEnum("royalty_base", ["gross_sales", "net_sales", "units"]);
export const invoiceStatus = pgEnum("invoice_status", [
  "rascunho",
  "emitida",
  "cancelada",
  "substituida",
]);
export const receivableStatus = pgEnum("receivable_status", [
  "previsto",
  "emitido",
  "parcial",
  "pago",
  "vencido",
  "cancelado",
]);
export const paymentMethod = pgEnum("payment_method", [
  "boleto",
  "pix",
  "ted",
  "wire_transfer",
  "cartao",
  "outro",
]);
export const ledgerEntryType = pgEnum("ledger_entry_type", [
  "royalty",
  "minimum_guarantee",
  "advance",
  "initial_fee",
  "annual_fee",
  "marketing_fee",
  "renewal_fee",
  "penalty",
  "tax",
  "adjustment",
]);

export type ContractStatus = (typeof contractStatus.enumValues)[number];
export type ExclusivityType = (typeof exclusivityType.enumValues)[number];
export type FeeType = (typeof feeType.enumValues)[number];
export type AlertType = (typeof alertType.enumValues)[number];
export type AlertStatus = (typeof alertStatus.enumValues)[number];
export type ContractDocType = (typeof contractDocType.enumValues)[number];
export type RoyaltyReportStatus = (typeof royaltyReportStatus.enumValues)[number];
export type ReportSource = (typeof reportSource.enumValues)[number];
export type ValidationSeverity = (typeof validationSeverity.enumValues)[number];
export type RoyaltyType = (typeof royaltyType.enumValues)[number];
export type RoyaltyBase = (typeof royaltyBase.enumValues)[number];
export type InvoiceStatus = (typeof invoiceStatus.enumValues)[number];
export type ReceivableStatus = (typeof receivableStatus.enumValues)[number];
export type PaymentMethod = (typeof paymentMethod.enumValues)[number];
export type LedgerEntryType = (typeof ledgerEntryType.enumValues)[number];

/* ---- Referências (moeda, território, categoria, tributos) ---- */
export const currency = pgTable("currency", {
  id: uuid("id").primaryKey().defaultRandom(),
  isoCode: char("iso_code", { length: 3 }).notNull().unique(),
  name: text("name").notNull(),
  symbol: text("symbol"),
});

export const territory = pgTable("territory", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  parentId: uuid("parent_id"),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  countryId: uuid("country_id"),
});

export const category = pgTable("category", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  parentId: uuid("parent_id"),
  name: text("name").notNull(),
  code: text("code"),
});

export const taxType = pgTable("tax_type", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  code: text("code").notNull(),
  name: text("name").notNull(),
});

/* ---- Contratos ---- */
export const contract = pgTable("contract", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  contractNumber: text("contract_number").notNull(),
  licenseeId: uuid("licensee_id").notNull(),
  status: contractStatus("status").notNull().default("rascunho"),
  exclusivity: exclusivityType("exclusivity").notNull().default("nao_exclusivo"),
  signingDate: date("signing_date"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  autoRenewal: boolean("auto_renewal").notNull().default(false),
  renewalTermMonths: integer("renewal_term_months"),
  minimumGuaranteeTotal: numeric("minimum_guarantee_total", { precision: 18, scale: 2 }),
  currencyId: uuid("currency_id").notNull(),
  responsibleUserId: uuid("responsible_user_id"),
  insuranceRequired: boolean("insurance_required").notNull().default(false),
  insuranceInfo: text("insurance_info"),
  notes: text("notes"),
  extra: jsonb("extra").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const contractFee = pgTable("contract_fee", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  contractId: uuid("contract_id").notNull(),
  feeType: feeType("fee_type").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  currencyId: uuid("currency_id").notNull(),
  dueDate: date("due_date"),
  recurrence: text("recurrence"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const contractBrand = pgTable(
  "contract_brand",
  {
    contractId: uuid("contract_id").notNull(),
    brandId: uuid("brand_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.contractId, t.brandId] })],
);

export const contractCategory = pgTable(
  "contract_category",
  {
    contractId: uuid("contract_id").notNull(),
    categoryId: uuid("category_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.contractId, t.categoryId] })],
);

export const contractTerritory = pgTable(
  "contract_territory",
  {
    contractId: uuid("contract_id").notNull(),
    territoryId: uuid("territory_id").notNull(),
    isExclusive: boolean("is_exclusive").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.contractId, t.territoryId] })],
);

export const contractDocument = pgTable("contract_document", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  contractId: uuid("contract_id").notNull(),
  docType: contractDocType("doc_type").notNull(),
  fileUri: text("file_uri").notNull(),
  fileName: text("file_name"),
  version: integer("version").notNull().default(1),
  isSigned: boolean("is_signed").notNull().default(false),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  uploadedBy: uuid("uploaded_by"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const minimumGuarantee = pgTable("minimum_guarantee", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  contractId: uuid("contract_id").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  currencyId: uuid("currency_id").notNull(),
  note: text("note"),
});

export const contractAlert = pgTable("contract_alert", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  contractId: uuid("contract_id").notNull(),
  alertType: alertType("alert_type").notNull(),
  daysBefore: integer("days_before"),
  triggerDate: date("trigger_date").notNull(),
  status: alertStatus("status").notNull().default("agendado"),
  channel: text("channel"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---- Royalties ---- */
export const royaltyReport = pgTable("royalty_report", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  contractId: uuid("contract_id").notNull(),
  licenseeId: uuid("licensee_id").notNull(),
  referenceLabel: text("reference_label").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  source: reportSource("source").notNull().default("manual"),
  status: royaltyReportStatus("status").notNull().default("rascunho"),
  currencyId: uuid("currency_id").notNull(),
  grossSalesTotal: numeric("gross_sales_total", { precision: 18, scale: 2 }).notNull().default("0"),
  netSalesTotal: numeric("net_sales_total", { precision: 18, scale: 2 }).notNull().default("0"),
  unitsTotal: numeric("units_total", { precision: 18, scale: 2 }).notNull().default("0"),
  royaltyDeclared: numeric("royalty_declared", { precision: 18, scale: 2 }).notNull().default("0"),
  royaltyCalculated: numeric("royalty_calculated", { precision: 18, scale: 2 }).notNull().default("0"),
  variance: numeric("variance", { precision: 18, scale: 2 }).notNull().default("0"),
  submittedBy: uuid("submitted_by"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const royaltyReportLine = pgTable("royalty_report_line", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  royaltyReportId: uuid("royalty_report_id").notNull(),
  sku: text("sku"),
  productName: text("product_name"),
  categoryId: uuid("category_id"),
  territoryId: uuid("territory_id"),
  units: numeric("units", { precision: 18, scale: 2 }).notNull().default("0"),
  unitPrice: numeric("unit_price", { precision: 18, scale: 4 }).notNull().default("0"),
  grossAmount: numeric("gross_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  netAmount: numeric("net_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  royaltyBaseAmt: numeric("royalty_base_amt", { precision: 18, scale: 2 }).notNull().default("0"),
  royaltyRate: numeric("royalty_rate", { precision: 9, scale: 4 }),
  royaltyAmount: numeric("royalty_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  currencyId: uuid("currency_id"),
});

export const royaltyReportValidation = pgTable("royalty_report_validation", {
  id: uuid("id").primaryKey().defaultRandom(),
  royaltyReportId: uuid("royalty_report_id").notNull(),
  ruleCode: text("rule_code").notNull(),
  severity: validationSeverity("severity").notNull(),
  message: text("message").notNull(),
  expectedValue: numeric("expected_value", { precision: 18, scale: 2 }),
  detectedValue: numeric("detected_value", { precision: 18, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const royaltyRule = pgTable("royalty_rule", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  contractId: uuid("contract_id").notNull(),
  royaltyType: royaltyType("royalty_type").notNull(),
  base: royaltyBase("base").notNull(),
  percentage: numeric("percentage", { precision: 9, scale: 4 }),
  fixedAmount: numeric("fixed_amount", { precision: 18, scale: 2 }),
  currencyId: uuid("currency_id"),
  minRoyalty: numeric("min_royalty", { precision: 18, scale: 2 }),
  maxRoyalty: numeric("max_royalty", { precision: 18, scale: 2 }),
  categoryId: uuid("category_id"),
  territoryId: uuid("territory_id"),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const royaltyTier = pgTable("royalty_tier", {
  id: uuid("id").primaryKey().defaultRandom(),
  royaltyRuleId: uuid("royalty_rule_id").notNull(),
  tierFrom: numeric("tier_from", { precision: 18, scale: 2 }).notNull(),
  tierTo: numeric("tier_to", { precision: 18, scale: 2 }),
  rate: numeric("rate", { precision: 9, scale: 4 }).notNull(),
});

/* ---- Financeiro ---- */
export const invoice = pgTable("invoice", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  licenseeId: uuid("licensee_id").notNull(),
  contractId: uuid("contract_id"),
  invoiceNumber: text("invoice_number").notNull(),
  nfeKey: text("nfe_key"),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date"),
  grossAmount: numeric("gross_amount", { precision: 18, scale: 2 }).notNull(),
  netAmount: numeric("net_amount", { precision: 18, scale: 2 }).notNull(),
  currencyId: uuid("currency_id").notNull(),
  status: invoiceStatus("status").notNull().default("rascunho"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoiceTax = pgTable("invoice_tax", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id").notNull(),
  taxTypeId: uuid("tax_type_id").notNull(),
  baseAmount: numeric("base_amount", { precision: 18, scale: 2 }).notNull(),
  rate: numeric("rate", { precision: 9, scale: 4 }).notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
});

export const receivable = pgTable("receivable", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  licenseeId: uuid("licensee_id").notNull(),
  contractId: uuid("contract_id"),
  invoiceId: uuid("invoice_id"),
  royaltyReportId: uuid("royalty_report_id"),
  description: text("description"),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  paidAmount: numeric("paid_amount", { precision: 18, scale: 2 }).notNull().default("0"),
  currencyId: uuid("currency_id").notNull(),
  dueDate: date("due_date").notNull(),
  status: receivableStatus("status").notNull().default("previsto"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payment = pgTable("payment", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  receivableId: uuid("receivable_id").notNull(),
  method: paymentMethod("method").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  currencyId: uuid("currency_id").notNull(),
  paidAt: timestamp("paid_at", { withTimezone: true }).notNull().defaultNow(),
  reference: text("reference"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ledgerEntry = pgTable("ledger_entry", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  licenseeId: uuid("licensee_id").notNull(),
  contractId: uuid("contract_id"),
  entryType: ledgerEntryType("entry_type").notNull(),
  referenceType: text("reference_type"),
  referenceId: uuid("reference_id"),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  currencyId: uuid("currency_id").notNull(),
  fxRate: numeric("fx_rate", { precision: 18, scale: 6 }),
  amountBaseCurrency: numeric("amount_base_currency", { precision: 18, scale: 2 }),
  entryDate: date("entry_date").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
});

/* =========================== FASE 4 — PROCUREMENT =========================== */
export const supplierStatus = pgEnum("supplier_status", [
  "em_homologacao",
  "ativo",
  "inativo",
  "bloqueado",
]);
export const supplierCategory = pgEnum("supplier_category", [
  "materia_prima",
  "manufatura",
  "embalagem",
  "logistica",
  "servicos",
  "marketing",
  "tecnologia",
]);
export const poStatus = pgEnum("po_status", [
  "rascunho",
  "enviado",
  "confirmado",
  "em_producao",
  "embarcado",
  "recebido",
  "cancelado",
]);
export const sourcingStatus = pgEnum("sourcing_status", [
  "aberto",
  "em_analise",
  "adjudicado",
  "cancelado",
]);

export type SupplierStatus = (typeof supplierStatus.enumValues)[number];
export type SupplierCategory = (typeof supplierCategory.enumValues)[number];
export type PoStatus = (typeof poStatus.enumValues)[number];
export type SourcingStatus = (typeof sourcingStatus.enumValues)[number];

export const supplier = pgTable(
  "supplier",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    code: text("code").notNull(),
    legalName: text("legal_name").notNull(),
    tradeName: text("trade_name"),
    category: supplierCategory("category").notNull().default("manufatura"),
    countryId: uuid("country_id"),
    city: text("city"),
    status: supplierStatus("status").notNull().default("em_homologacao"),
    rating: numeric("rating", { precision: 3, scale: 1 }),
    leadTimeDays: integer("lead_time_days"),
    paymentTerms: text("payment_terms"),
    email: text("email"),
    phone: text("phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [unique("uq_supplier_code").on(t.tenantId, t.code)],
);

export const purchaseOrder = pgTable(
  "purchase_order",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    poNumber: text("po_number").notNull(),
    supplierId: uuid("supplier_id").notNull(),
    licenseeId: uuid("licensee_id"),
    status: poStatus("status").notNull().default("rascunho"),
    currencyId: uuid("currency_id").notNull(),
    totalAmount: numeric("total_amount", { precision: 18, scale: 2 }).notNull().default("0"),
    orderDate: date("order_date"),
    expectedDate: date("expected_date"),
    receivedDate: date("received_date"),
    incoterm: text("incoterm"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_po_number").on(t.tenantId, t.poNumber)],
);

export const purchaseOrderItem = pgTable("purchase_order_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  purchaseOrderId: uuid("purchase_order_id").notNull(),
  productId: uuid("product_id"),
  description: text("description").notNull(),
  sku: text("sku"),
  quantity: numeric("quantity", { precision: 18, scale: 2 }).notNull().default("0"),
  unitPrice: numeric("unit_price", { precision: 18, scale: 4 }).notNull().default("0"),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull().default("0"),
  receivedQty: numeric("received_qty", { precision: 18, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sourcingEvent = pgTable("sourcing_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  title: text("title").notNull(),
  categoryId: uuid("category_id"),
  status: sourcingStatus("status").notNull().default("aberto"),
  dueDate: date("due_date"),
  baselineAmount: numeric("baseline_amount", { precision: 18, scale: 2 }),
  weightPrice: integer("weight_price").notNull().default(50),
  weightLead: integer("weight_lead").notNull().default(20),
  weightQuality: integer("weight_quality").notNull().default(20),
  weightPayment: integer("weight_payment").notNull().default(10),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sourcingQuote = pgTable("sourcing_quote", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  sourcingEventId: uuid("sourcing_event_id").notNull(),
  supplierId: uuid("supplier_id").notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  currencyId: uuid("currency_id"),
  leadTimeDays: integer("lead_time_days"),
  score: numeric("score", { precision: 4, scale: 1 }),
  freightCost: numeric("freight_cost", { precision: 18, scale: 2 }).notNull().default("0"),
  taxCost: numeric("tax_cost", { precision: 18, scale: 2 }).notNull().default("0"),
  otherCost: numeric("other_cost", { precision: 18, scale: 2 }).notNull().default("0"),
  paymentTermsDays: integer("payment_terms_days"),
  isAwarded: boolean("is_awarded").notNull().default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const negotiationRound = pgTable("negotiation_round", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  sourcingQuoteId: uuid("sourcing_quote_id").notNull(),
  roundNumber: integer("round_number").notNull().default(1),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
});

/* ---- Requisição de compra ---- */
export const purchaseRequisitionStatus = pgEnum("purchase_requisition_status", [
  "rascunho",
  "enviada",
  "aprovada",
  "reprovada",
  "convertida",
  "cancelada",
]);
export type PurchaseRequisitionStatus = (typeof purchaseRequisitionStatus.enumValues)[number];

export const purchaseRequisition = pgTable(
  "purchase_requisition",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    requisitionNumber: text("requisition_number").notNull(),
    title: text("title").notNull(),
    justification: text("justification"),
    requesterUserId: uuid("requester_user_id"),
    status: purchaseRequisitionStatus("status").notNull().default("rascunho"),
    neededBy: date("needed_by"),
    decidedBy: uuid("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decisionComment: text("decision_comment"),
    convertedPoId: uuid("converted_po_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("uq_requisition_number").on(t.tenantId, t.requisitionNumber)],
);

export const purchaseRequisitionItem = pgTable("purchase_requisition_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  purchaseRequisitionId: uuid("purchase_requisition_id").notNull(),
  description: text("description").notNull(),
  sku: text("sku"),
  quantity: numeric("quantity", { precision: 18, scale: 2 }).notNull().default("0"),
  estimatedUnitPrice: numeric("estimated_unit_price", { precision: 18, scale: 4 })
    .notNull()
    .default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---- Aditivos de contrato ---- */
export const contractAmendmentType = pgEnum("contract_amendment_type", [
  "aditivo",
  "prorrogacao",
  "reajuste",
  "rescisao",
  "outro",
]);
export type ContractAmendmentType = (typeof contractAmendmentType.enumValues)[number];

export const contractAmendment = pgTable("contract_amendment", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  contractId: uuid("contract_id").notNull(),
  amendmentNumber: text("amendment_number").notNull(),
  amendmentType: contractAmendmentType("amendment_type").notNull().default("aditivo"),
  description: text("description"),
  effectiveDate: date("effective_date"),
  newEndDate: date("new_end_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
});

/* ---- Qualidade ---- */
export const qualityInspectionType = pgEnum("quality_inspection_type", [
  "recebimento",
  "producao",
  "auditoria",
  "outro",
]);
export const qualityResult = pgEnum("quality_result", [
  "pendente",
  "aprovado",
  "aprovado_condicional",
  "reprovado",
]);
export const ncSeverity = pgEnum("nc_severity", ["baixa", "media", "alta", "critica"]);
export const ncStatus = pgEnum("nc_status", ["aberta", "em_tratamento", "resolvida", "cancelada"]);
export type QualityInspectionType = (typeof qualityInspectionType.enumValues)[number];
export type QualityResult = (typeof qualityResult.enumValues)[number];
export type NcSeverity = (typeof ncSeverity.enumValues)[number];
export type NcStatus = (typeof ncStatus.enumValues)[number];

export const qualityInspection = pgTable(
  "quality_inspection",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    inspectionNumber: text("inspection_number").notNull(),
    inspectionType: qualityInspectionType("inspection_type").notNull().default("recebimento"),
    supplierId: uuid("supplier_id"),
    purchaseOrderId: uuid("purchase_order_id"),
    productId: uuid("product_id"),
    title: text("title").notNull(),
    result: qualityResult("result").notNull().default("pendente"),
    sampleSize: integer("sample_size").notNull().default(0),
    defectsFound: integer("defects_found").notNull().default(0),
    inspectedAt: date("inspected_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
  },
  (t) => [unique("uq_inspection_number").on(t.tenantId, t.inspectionNumber)],
);

export const nonConformity = pgTable(
  "non_conformity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    ncNumber: text("nc_number").notNull(),
    qualityInspectionId: uuid("quality_inspection_id"),
    supplierId: uuid("supplier_id"),
    severity: ncSeverity("severity").notNull().default("media"),
    status: ncStatus("status").notNull().default("aberta"),
    description: text("description").notNull(),
    disposition: text("disposition"),
    correctiveAction: text("corrective_action"),
    openedAt: date("opened_at"),
    resolvedAt: date("resolved_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
  },
  (t) => [unique("uq_nc_number").on(t.tenantId, t.ncNumber)],
);

/* =========================== FASE 5 — AUDITORIA =========================== */
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id"),
  userId: uuid("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  changes: jsonb("changes"),
  actorName: text("actor_name"),
  actorIp: text("actor_ip"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ============ FASE 6 — SUPRIMENTOS: PERFORMANCE, RISCO & LOGÍSTICA ============ */

/* ---- Avaliação de fornecedor (scorecard + risco) ---- */
export const supplierRiskLevel = pgEnum("supplier_risk_level", [
  "baixo",
  "medio",
  "alto",
  "critico",
]);
export type SupplierRiskLevel = (typeof supplierRiskLevel.enumValues)[number];

export const supplierEvaluation = pgTable(
  "supplier_evaluation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    supplierId: uuid("supplier_id").notNull(),
    periodLabel: text("period_label").notNull(),
    qualityScore: integer("quality_score").notNull().default(0),
    deliveryScore: integer("delivery_score").notNull().default(0),
    costScore: integer("cost_score").notNull().default(0),
    complianceScore: integer("compliance_score").notNull().default(0),
    overallScore: integer("overall_score").notNull().default(0),
    riskLevel: supplierRiskLevel("risk_level").notNull().default("medio"),
    strengths: text("strengths"),
    weaknesses: text("weaknesses"),
    notes: text("notes"),
    evaluatedAt: date("evaluated_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
  },
  (t) => [unique("uq_supplier_evaluation_period").on(t.tenantId, t.supplierId, t.periodLabel)],
);

/* ---- Rastreamento logístico (supply chain) ---- */
export const shipmentStatus = pgEnum("shipment_status", [
  "preparacao",
  "em_transito",
  "desembaraco",
  "entregue",
  "atrasado",
  "cancelado",
]);
export type ShipmentStatus = (typeof shipmentStatus.enumValues)[number];

export const shipment = pgTable(
  "shipment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    shipmentNumber: text("shipment_number").notNull(),
    purchaseOrderId: uuid("purchase_order_id"),
    supplierId: uuid("supplier_id"),
    carrier: text("carrier"),
    trackingCode: text("tracking_code"),
    status: shipmentStatus("status").notNull().default("preparacao"),
    origin: text("origin"),
    destination: text("destination"),
    incoterm: text("incoterm"),
    dispatchedAt: date("dispatched_at"),
    eta: date("eta"),
    deliveredAt: date("delivered_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
  },
  (t) => [unique("uq_shipment_number").on(t.tenantId, t.shipmentNumber)],
);

export const shipmentEvent = pgTable("shipment_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  shipmentId: uuid("shipment_id").notNull(),
  status: shipmentStatus("status").notNull(),
  description: text("description"),
  location: text("location"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
});

/* ============ FASE 7 — PIPELINE DE LICENCIAMENTO (CRM) ============ */
export const opportunityStage = pgEnum("opportunity_stage", [
  "prospeccao",
  "qualificacao",
  "proposta",
  "negociacao",
  "ganho",
  "perdido",
]);
export type OpportunityStage = (typeof opportunityStage.enumValues)[number];

export const licensingOpportunity = pgTable(
  "licensing_opportunity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    opportunityNumber: text("opportunity_number").notNull(),
    name: text("name").notNull(),
    companyName: text("company_name"),
    contactName: text("contact_name"),
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    brandId: uuid("brand_id"),
    segmentId: uuid("segment_id"),
    stage: opportunityStage("stage").notNull().default("prospeccao"),
    estimatedValue: numeric("estimated_value", { precision: 18, scale: 2 }).notNull().default("0"),
    probability: integer("probability").notNull().default(20),
    source: text("source"),
    expectedCloseDate: date("expected_close_date"),
    ownerUserId: uuid("owner_user_id"),
    notes: text("notes"),
    lostReason: text("lost_reason"),
    licenseeId: uuid("licensee_id"),
    contractId: uuid("contract_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
  },
  (t) => [unique("uq_opportunity_number").on(t.tenantId, t.opportunityNumber)],
);

export const opportunityActivity = pgTable("opportunity_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  opportunityId: uuid("opportunity_id").notNull(),
  activityType: text("activity_type").notNull().default("nota"),
  description: text("description").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
});

/* ============ FASE 8 — MARKETING & TRADE MARKETING ============ */
export const campaignType = pgEnum("campaign_type", [
  "lancamento",
  "sazonal",
  "promocional",
  "institucional",
  "cobranding",
]);
export const campaignStatus = pgEnum("campaign_status", [
  "planejamento",
  "ativa",
  "pausada",
  "concluida",
  "cancelada",
]);
export const activationType = pgEnum("activation_type", [
  "pdv",
  "digital",
  "evento",
  "influencer",
  "outro",
]);
export type CampaignType = (typeof campaignType.enumValues)[number];
export type CampaignStatus = (typeof campaignStatus.enumValues)[number];
export type ActivationType = (typeof activationType.enumValues)[number];

export const marketingCampaign = pgTable(
  "marketing_campaign",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    campaignNumber: text("campaign_number").notNull(),
    name: text("name").notNull(),
    brandId: uuid("brand_id"),
    licenseeId: uuid("licensee_id"),
    campaignType: campaignType("campaign_type").notNull().default("promocional"),
    status: campaignStatus("status").notNull().default("planejamento"),
    budget: numeric("budget", { precision: 18, scale: 2 }).notNull().default("0"),
    spent: numeric("spent", { precision: 18, scale: 2 }).notNull().default("0"),
    channel: text("channel"),
    goal: text("goal"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
  },
  (t) => [unique("uq_campaign_number").on(t.tenantId, t.campaignNumber)],
);

export const campaignActivation = pgTable("campaign_activation", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  campaignId: uuid("campaign_id").notNull(),
  name: text("name").notNull(),
  activationType: activationType("activation_type").notNull().default("pdv"),
  location: text("location"),
  cost: numeric("cost", { precision: 18, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("planejada"),
  scheduledAt: date("scheduled_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
});

/* ============ FASE 8 — CATÁLOGO DE ITENS (SKU) ============ */
export const catalogItemStatus = pgEnum("catalog_item_status", ["ativo", "inativo", "descontinuado"]);
export type CatalogItemStatus = (typeof catalogItemStatus.enumValues)[number];

export const catalogItem = pgTable(
  "catalog_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    sku: text("sku").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    categoryId: uuid("category_id"),
    brandId: uuid("brand_id"),
    ncm: text("ncm"),
    cest: text("cest"),
    unit: text("unit").notNull().default("un"),
    listPrice: numeric("list_price", { precision: 18, scale: 2 }).notNull().default("0"),
    status: catalogItemStatus("status").notNull().default("ativo"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
  },
  (t) => [unique("uq_catalog_sku").on(t.tenantId, t.sku)],
);


/* ============ FASE 9 — JURÍDICO ============ */
export const legalCaseType = pgEnum("legal_case_type", [
  "contencioso",
  "consultivo",
  "contratual",
  "propriedade_intelectual",
  "trabalhista",
  "tributario",
]);
export const legalCaseStatus = pgEnum("legal_case_status", [
  "aberto",
  "em_andamento",
  "suspenso",
  "encerrado",
  "arquivado",
]);
export const legalCasePriority = pgEnum("legal_case_priority", ["baixa", "media", "alta", "critica"]);
export const legalEventType = pgEnum("legal_event_type", [
  "andamento",
  "audiencia",
  "peticao",
  "decisao",
  "acordo",
  "prazo",
]);
export type LegalCaseType = (typeof legalCaseType.enumValues)[number];
export type LegalCaseStatus = (typeof legalCaseStatus.enumValues)[number];
export type LegalCasePriority = (typeof legalCasePriority.enumValues)[number];
export type LegalEventType = (typeof legalEventType.enumValues)[number];

export const legalCase = pgTable(
  "legal_case",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    caseNumber: text("case_number").notNull(),
    title: text("title").notNull(),
    caseType: legalCaseType("case_type").notNull().default("contencioso"),
    status: legalCaseStatus("status").notNull().default("aberto"),
    priority: legalCasePriority("priority").notNull().default("media"),
    counterparty: text("counterparty"),
    licenseeId: uuid("licensee_id"),
    brandId: uuid("brand_id"),
    amountAtRisk: numeric("amount_at_risk", { precision: 18, scale: 2 }).notNull().default("0"),
    responsible: text("responsible"),
    forum: text("forum"),
    openedAt: date("opened_at"),
    dueDate: date("due_date"),
    closedAt: date("closed_at"),
    description: text("description"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
  },
  (t) => [unique("uq_legal_case_number").on(t.tenantId, t.caseNumber)],
);

export const legalCaseEvent = pgTable("legal_case_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  caseId: uuid("case_id").notNull(),
  eventType: legalEventType("event_type").notNull().default("andamento"),
  description: text("description").notNull(),
  occurredAt: date("occurred_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
});

/* ============ FASE 9 — CRONOGRAMAS & TAREFAS ============ */
export const taskStatus = pgEnum("task_status", ["a_fazer", "em_andamento", "concluida", "cancelada"]);
export const taskPriority = pgEnum("task_priority", ["baixa", "media", "alta", "urgente"]);
export type TaskStatus = (typeof taskStatus.enumValues)[number];
export type TaskPriority = (typeof taskPriority.enumValues)[number];

export const task = pgTable("task", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatus("status").notNull().default("a_fazer"),
  priority: taskPriority("priority").notNull().default("media"),
  assignee: text("assignee"),
  dueDate: date("due_date"),
  completedAt: date("completed_at"),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  entityLabel: text("entity_label"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: uuid("created_by"),
});

/* ============ FASE 9 — CONTRATOS DE FORNECIMENTO ============ */
export const supplyContractStatus = pgEnum("supply_contract_status", [
  "rascunho",
  "vigente",
  "suspenso",
  "encerrado",
  "renovado",
]);
export type SupplyContractStatus = (typeof supplyContractStatus.enumValues)[number];

export const supplyContract = pgTable(
  "supply_contract",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    contractNumber: text("contract_number").notNull(),
    title: text("title").notNull(),
    supplierId: uuid("supplier_id").notNull(),
    status: supplyContractStatus("status").notNull().default("rascunho"),
    categoryId: uuid("category_id"),
    currency: text("currency").notNull().default("BRL"),
    totalValue: numeric("total_value", { precision: 18, scale: 2 }).notNull().default("0"),
    sla: text("sla"),
    paymentTerms: text("payment_terms"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    autoRenew: boolean("auto_renew").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
  },
  (t) => [unique("uq_supply_contract_number").on(t.tenantId, t.contractNumber)],
);

/* ============ FASE 10 — NOTIFICAÇÕES ============ */
export const notificationType = pgEnum("notification_type", [
  "contract_expiring",
  "receivable_overdue",
  "quality_nc",
  "task_overdue",
  "legal_deadline",
  "system",
]);
export type NotificationType = (typeof notificationType.enumValues)[number];

export const notification = pgTable("notification", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: uuid("user_id"),
  type: notificationType("type").notNull().default("system"),
  severity: text("severity").notNull().default("info"),
  title: text("title").notNull(),
  body: text("body"),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  link: text("link"),
  dedupeKey: text("dedupe_key"),
  emailedAt: timestamp("emailed_at", { withTimezone: true }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
