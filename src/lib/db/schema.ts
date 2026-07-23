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

