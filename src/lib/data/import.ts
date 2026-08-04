import "server-only";
import * as XLSX from "xlsx";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { licensee, segment, country, catalogItem, category, brand, supplier } from "@/lib/db/schema";
import { createLicensee } from "./licensees";
import { createCatalogItem } from "./catalog";
import { createSupplier } from "./suppliers";
import type { LicenseeStatus } from "@/lib/db/schema";

/* ============================================================================
 * Importação em massa (CSV / XLSX) — licenciados, catálogo e fornecedores.
 * Fluxo: parse → validação linha a linha (com resolução nome→id) → prévia →
 * commit (reaproveita as funções create* existentes). Sem dependência nova
 * (usa o `xlsx` já presente para leitura, além da exportação).
 * ==========================================================================*/

export type ImportEntity = "licensees" | "catalog" | "suppliers";

export type RowStatus = "ok" | "duplicate" | "error";

export type PreviewRow = {
  line: number; // linha de dados (1 = primeira após o cabeçalho)
  status: RowStatus;
  label: string; // identificador principal para exibição
  messages: string[]; // erros/avisos
  cells: string[]; // colunas-chave para a prévia
};

export type PreviewResult = {
  ok: boolean;
  error?: string;
  entity: ImportEntity;
  displayColumns: string[];
  summary: { total: number; valid: number; duplicates: number; errors: number };
  rows: PreviewRow[]; // limitado para exibição
  shownRows: number;
};

export type CommitResult = {
  ok: boolean;
  error?: string;
  inserted: number;
  skippedDuplicates: number;
  failed: number;
  failures: { line: number; label: string; message: string }[];
};

const MAX_PREVIEW_ROWS = 200;
const MAX_IMPORT_ROWS = 2000;

/* ------------------------------- utilidades ------------------------------ */

/** Normaliza texto p/ casar cabeçalhos: minúsculo, sem acento, sem espaços extras. */
function norm(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function numOrNull(v: string | undefined | null): number | null {
  if (v == null) return null;
  let s = String(v).trim();
  if (s === "") return null;
  // aceita "1.234,56" (pt-BR) e "1234.56"
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseBuffer(buf: Buffer): { headers: string[]; rows: Record<string, string>[] } {
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return { headers: [], rows: [] };
  const arr = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    blankrows: false,
    raw: false,
    defval: "",
  });
  if (!arr.length) return { headers: [], rows: [] };
  const headers = (arr[0] as unknown[]).map((h) => String(h ?? "").trim());
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < arr.length; i++) {
    const r = arr[i] as unknown[];
    if (!r || r.every((c) => String(c ?? "").trim() === "")) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, j) => {
      obj[norm(h)] = String(r[j] ?? "").trim();
    });
    rows.push(obj);
  }
  return { headers, rows };
}

/** Leitor tolerante: pega o valor da 1ª coluna cujo cabeçalho normalizado casa. */
function cell(row: Record<string, string>, aliases: string[]): string {
  for (const a of aliases) {
    const v = row[norm(a)];
    if (v != null && v !== "") return v;
  }
  return "";
}

function matchEnum<T extends string>(raw: string, allowed: readonly T[]): T | null {
  const n = norm(raw).replace(/\s+/g, "_");
  const hit = allowed.find((a) => norm(a) === norm(raw) || a === n);
  return (hit as T) ?? null;
}

/* ------------------------------ tipos de config -------------------------- */

type BuiltRow<V> =
  | { ok: true; value: V; dupKey: string | null; label: string; cells: string[]; warnings: string[] }
  | { ok: false; label: string; cells: string[]; errors: string[] };

type EntityConfig<V> = {
  displayColumns: string[];
  /** cabeçalhos aceitos + exemplo, para gerar o modelo CSV. */
  templateHeaders: string[];
  templateExample: string[];
  /** carrega contexto (lookups + conjuntos de dedupe) uma vez por importação. */
  loadContext: (tenantId: string) => Promise<ImportContext>;
  buildRow: (row: Record<string, string>, ctx: ImportContext) => BuiltRow<V>;
  create: (tenantId: string, value: V, userId: string) => Promise<unknown>;
};

type ImportContext = {
  countriesByName: Map<string, string>;
  segmentsByName: Map<string, string>;
  categoriesByName: Map<string, string>;
  brandsByKey: Map<string, string>;
  existing: Set<string>; // chaves já existentes (dedupe)
};

async function baseCountries(): Promise<Map<string, string>> {
  const rows = await db.select({ id: country.id, name: country.name }).from(country);
  const m = new Map<string, string>();
  for (const r of rows) m.set(norm(r.name), r.id);
  return m;
}

/* --------------------------------- LICENCIADOS --------------------------- */

type LicenseeValue = Parameters<typeof createLicensee>[1];

const LICENSEE_STATUS = ["em_negociacao", "ativo", "inativo", "suspenso", "encerrado"] as const;

const licenseeConfig: EntityConfig<LicenseeValue> = {
  displayColumns: ["Razão Social", "Nome Fantasia", "País", "Segmento", "Status"],
  templateHeaders: [
    "Razão Social",
    "Nome Fantasia",
    "CNPJ/Tax ID",
    "País",
    "Segmento",
    "Estado",
    "Cidade",
    "Website",
    "Status (ativo/inativo/em_negociacao/suspenso/encerrado)",
  ],
  templateExample: [
    "MegaCalçados S.A.",
    "MegaCalçados",
    "12.345.678/0001-90",
    "Brasil",
    "Calçados",
    "SP",
    "São Paulo",
    "https://megacalcados.com",
    "ativo",
  ],
  async loadContext(tenantId) {
    const [countriesByName, segRows, existRows] = await Promise.all([
      baseCountries(),
      db.select({ id: segment.id, name: segment.name }).from(segment).where(eq(segment.tenantId, tenantId)),
      db
        .select({ legalName: licensee.legalName })
        .from(licensee)
        .where(and(eq(licensee.tenantId, tenantId), isNull(licensee.deletedAt))),
    ]);
    const segmentsByName = new Map<string, string>();
    for (const s of segRows) segmentsByName.set(norm(s.name), s.id);
    const existing = new Set<string>();
    for (const e of existRows) existing.add(norm(e.legalName));
    return { countriesByName, segmentsByName, categoriesByName: new Map(), brandsByKey: new Map(), existing };
  },
  buildRow(row, ctx) {
    const legalName = cell(row, ["Razão Social", "Razao Social", "razao social", "legalName", "nome"]);
    const tradeName = cell(row, ["Nome Fantasia", "tradeName", "fantasia"]);
    const taxId = cell(row, ["CNPJ/Tax ID", "CNPJ", "Tax ID", "taxId", "cnpj"]);
    const countryName = cell(row, ["País", "Pais", "country"]);
    const segmentName = cell(row, ["Segmento", "segment"]);
    const state = cell(row, ["Estado", "UF", "state"]);
    const city = cell(row, ["Cidade", "city"]);
    const website = cell(row, ["Website", "site", "url"]);
    const statusRaw = cell(row, ["Status", "situação", "situacao"]);
    const hardErrors: string[] = [];
    const warnings: string[] = [];
    if (!legalName) hardErrors.push("Razão Social é obrigatória.");

    const countryId = countryName ? ctx.countriesByName.get(norm(countryName)) ?? null : null;
    if (countryName && !countryId) warnings.push(`País "${countryName}" não encontrado — deixado em branco.`);
    const segmentId = segmentName ? ctx.segmentsByName.get(norm(segmentName)) ?? null : null;
    if (segmentName && !segmentId) warnings.push(`Segmento "${segmentName}" não encontrado — deixado em branco.`);
    const status = statusRaw ? matchEnum(statusRaw, LICENSEE_STATUS) : "ativo";
    if (statusRaw && !status) hardErrors.push(`Status "${statusRaw}" inválido.`);

    const cells = [legalName || "—", tradeName || "—", countryName || "—", segmentName || "—", statusRaw || "ativo"];
    if (hardErrors.length)
      return { ok: false, label: legalName || "(sem razão social)", cells, errors: [...hardErrors, ...warnings] };

    const value: LicenseeValue = {
      legalName,
      tradeName: tradeName || null,
      taxId: taxId || null,
      countryId,
      segmentId,
      state: state || null,
      city: city || null,
      website: website || null,
      riskRating: null,
      financialScore: null,
      status: (status ?? "ativo") as LicenseeStatus,
    };
    return { ok: true, value, dupKey: norm(legalName), label: legalName, cells, warnings };
  },
  async create(tenantId, value) {
    await createLicensee(tenantId, value);
  },
};

/* ---------------------------------- CATÁLOGO ----------------------------- */

type CatalogValue = Parameters<typeof createCatalogItem>[1];

const CATALOG_STATUS = ["ativo", "inativo", "descontinuado"] as const;
const AUDIENCE = ["masculino", "feminino", "infantil", "unissex"] as const;

const catalogConfig: EntityConfig<CatalogValue> = {
  displayColumns: ["SKU", "Nome", "Categoria", "Marca", "Preço tabela", "Status"],
  templateHeaders: [
    "SKU",
    "Nome",
    "Categoria",
    "Marca",
    "Unidade",
    "Preço de tabela",
    "Preço de custo",
    "Público (masculino/feminino/infantil/unissex)",
    "NCM",
    "UPC",
    "Status (ativo/inativo/descontinuado)",
  ],
  templateExample: [
    "NS-CAM-100",
    "Camiseta Torcedor NovaSport",
    "Camisetas",
    "NovaSport",
    "un",
    "79,90",
    "32,50",
    "masculino",
    "6109.10.00",
    "000123456789",
    "ativo",
  ],
  async loadContext(tenantId) {
    const [catRows, brandRows, existRows] = await Promise.all([
      db.select({ id: category.id, name: category.name }).from(category).where(eq(category.tenantId, tenantId)),
      db.select({ id: brand.id, name: brand.name, code: brand.code }).from(brand).where(eq(brand.tenantId, tenantId)),
      db.select({ sku: catalogItem.sku }).from(catalogItem).where(eq(catalogItem.tenantId, tenantId)),
    ]);
    const categoriesByName = new Map<string, string>();
    for (const c of catRows) categoriesByName.set(norm(c.name), c.id);
    const brandsByKey = new Map<string, string>();
    for (const b of brandRows) {
      brandsByKey.set(norm(b.name), b.id);
      if (b.code) brandsByKey.set(norm(b.code), b.id);
    }
    const existing = new Set<string>();
    for (const e of existRows) existing.add(norm(e.sku));
    return { countriesByName: new Map(), segmentsByName: new Map(), categoriesByName, brandsByKey, existing };
  },
  buildRow(row, ctx) {
    const sku = cell(row, ["SKU", "codigo", "código"]);
    const name = cell(row, ["Nome", "Nome do item", "name", "produto"]);
    const categoryName = cell(row, ["Categoria", "category"]);
    const brandKey = cell(row, ["Marca", "brand"]);
    const unit = cell(row, ["Unidade", "unit", "un"]) || "un";
    const listPrice = numOrNull(cell(row, ["Preço de tabela", "Preco de tabela", "Preço tabela", "listPrice", "preco"]));
    const costPrice = numOrNull(cell(row, ["Preço de custo", "Preco de custo", "costPrice"]));
    const publicoRaw = cell(row, ["Público", "Publico", "publico", "audience"]);
    const ncm = cell(row, ["NCM", "ncm"]);
    const upc = cell(row, ["UPC", "codigo de barras", "código de barras", "barcode"]);
    const statusRaw = cell(row, ["Status", "situação", "situacao"]);
    const hardErrors: string[] = [];
    const warnings: string[] = [];
    if (!sku) hardErrors.push("SKU é obrigatório.");
    if (!name) hardErrors.push("Nome é obrigatório.");

    const categoryId = categoryName ? ctx.categoriesByName.get(norm(categoryName)) ?? null : null;
    if (categoryName && !categoryId) warnings.push(`Categoria "${categoryName}" não encontrada — deixada em branco.`);
    const brandId = brandKey ? ctx.brandsByKey.get(norm(brandKey)) ?? null : null;
    if (brandKey && !brandId) warnings.push(`Marca "${brandKey}" não encontrada — deixada em branco.`);
    const publico = publicoRaw ? matchEnum(publicoRaw, AUDIENCE) : null;
    if (publicoRaw && !publico) hardErrors.push(`Público "${publicoRaw}" inválido.`);
    const status = statusRaw ? matchEnum(statusRaw, CATALOG_STATUS) : "ativo";
    if (statusRaw && !status) hardErrors.push(`Status "${statusRaw}" inválido.`);

    const cells = [sku || "—", name || "—", categoryName || "—", brandKey || "—", listPrice != null ? String(listPrice) : "—", statusRaw || "ativo"];
    if (hardErrors.length)
      return { ok: false, label: sku || name || "(sem SKU)", cells, errors: [...hardErrors, ...warnings] };

    const value: CatalogValue = {
      sku,
      name,
      description: null,
      categoryId,
      brandId,
      ncm: ncm || null,
      cest: null,
      unit,
      listPrice: listPrice ?? 0,
      costPrice,
      publico,
      gradeId: null,
      pantone: null,
      upi: null,
      upc: upc || null,
      discontinuationReason: null,
      status: (status ?? "ativo") as (typeof CATALOG_STATUS)[number],
    };
    return { ok: true, value, dupKey: norm(sku), label: sku, cells, warnings };
  },
  async create(tenantId, value, userId) {
    await createCatalogItem(tenantId, value, userId);
  },
};

/* -------------------------------- FORNECEDORES --------------------------- */

type SupplierValue = Parameters<typeof createSupplier>[1];

const SUPPLIER_CATEGORY = ["materia_prima", "manufatura", "embalagem", "logistica", "servicos", "marketing", "tecnologia"] as const;
const SUPPLIER_STATUS = ["prospect", "em_avaliacao", "em_homologacao", "homologado", "condicional", "suspenso", "bloqueado", "inativo", "descontinuado", "ativo"] as const;
const SUPPLIER_TYPE = ["fabricante", "distribuidor", "importador", "prestador_servico", "agencia", "transportadora", "materia_prima", "embalagem", "grafico", "textil", "tecnologia", "consultoria", "laboratorio", "operador_logistico"] as const;

const supplierConfig: EntityConfig<SupplierValue> = {
  displayColumns: ["Código", "Razão Social", "Categoria", "País", "Status"],
  templateHeaders: [
    "Código",
    "Razão Social",
    "Nome Fantasia",
    "CNPJ",
    "Categoria (materia_prima/manufatura/embalagem/logistica/servicos/marketing/tecnologia)",
    "Tipo (fabricante/distribuidor/importador/...)",
    "País",
    "Estado",
    "Cidade",
    "E-mail",
    "Telefone",
    "Status (prospect/homologado/ativo/...)",
  ],
  templateExample: [
    "FOR-100",
    "Pacific Manufacturing Co.",
    "Pacific Mfg",
    "98.765.432/0001-10",
    "manufatura",
    "fabricante",
    "China",
    "Guangdong",
    "Shenzhen",
    "contato@pacificmfg.com",
    "+86 755 0000 0000",
    "homologado",
  ],
  async loadContext(tenantId) {
    const [countriesByName, existRows] = await Promise.all([
      baseCountries(),
      db.select({ code: supplier.code }).from(supplier).where(eq(supplier.tenantId, tenantId)),
    ]);
    const existing = new Set<string>();
    for (const e of existRows) existing.add(norm(e.code));
    return { countriesByName, segmentsByName: new Map(), categoriesByName: new Map(), brandsByKey: new Map(), existing };
  },
  buildRow(row, ctx) {
    const code = cell(row, ["Código", "Codigo", "code"]);
    const legalName = cell(row, ["Razão Social", "Razao Social", "legalName", "nome"]);
    const tradeName = cell(row, ["Nome Fantasia", "tradeName", "fantasia"]);
    const cnpj = cell(row, ["CNPJ", "cnpj", "Tax ID"]);
    const categoryRaw = cell(row, ["Categoria", "category"]);
    const typeRaw = cell(row, ["Tipo", "type", "supplierType"]);
    const countryName = cell(row, ["País", "Pais", "country"]);
    const stateProvince = cell(row, ["Estado", "UF", "state", "province"]);
    const city = cell(row, ["Cidade", "city"]);
    const email = cell(row, ["E-mail", "Email", "email"]);
    const phone = cell(row, ["Telefone", "phone", "fone"]);
    const statusRaw = cell(row, ["Status", "situação", "situacao"]);
    const hardErrors: string[] = [];
    const warnings: string[] = [];
    if (!code) hardErrors.push("Código é obrigatório.");
    if (!legalName) hardErrors.push("Razão Social é obrigatória.");

    const category = categoryRaw ? matchEnum(categoryRaw, SUPPLIER_CATEGORY) : null;
    if (!categoryRaw) hardErrors.push("Categoria é obrigatória.");
    else if (!category) hardErrors.push(`Categoria "${categoryRaw}" inválida.`);
    const supplierType = typeRaw ? matchEnum(typeRaw, SUPPLIER_TYPE) : null;
    if (typeRaw && !supplierType) hardErrors.push(`Tipo "${typeRaw}" inválido.`);
    const countryId = countryName ? ctx.countriesByName.get(norm(countryName)) ?? null : null;
    if (countryName && !countryId) warnings.push(`País "${countryName}" não encontrado — deixado em branco.`);
    const status = statusRaw ? matchEnum(statusRaw, SUPPLIER_STATUS) : "prospect";
    if (statusRaw && !status) hardErrors.push(`Status "${statusRaw}" inválido.`);

    const cells = [code || "—", legalName || "—", categoryRaw || "—", countryName || "—", statusRaw || "prospect"];
    if (hardErrors.length)
      return { ok: false, label: code || legalName || "(sem código)", cells, errors: [...hardErrors, ...warnings] };

    const value: SupplierValue = {
      code,
      legalName,
      tradeName: tradeName || null,
      supplierType,
      economicGroup: null,
      cnpj: cnpj || null,
      stateRegistration: null,
      category: category!,
      countryId,
      stateProvince: stateProvince || null,
      city: city || null,
      address: null,
      website: null,
      capacity: null,
      moq: null,
      incoterms: null,
      currencies: null,
      status: (status ?? "prospect") as (typeof SUPPLIER_STATUS)[number],
      rating: null,
      leadTimeDays: null,
      paymentTerms: null,
      email: email || null,
      phone: phone || null,
    };
    return { ok: true, value, dupKey: norm(code), label: code, cells, warnings };
  },
  async create(tenantId, value) {
    await createSupplier(tenantId, value);
  },
};

const CONFIGS = {
  licensees: licenseeConfig,
  catalog: catalogConfig,
  suppliers: supplierConfig,
} as const;

/* --------------------------- prévia e commit ----------------------------- */

export function importTemplateCsv(entity: ImportEntity): string {
  const cfg = CONFIGS[entity];
  const esc = (s: string) => (/[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return cfg.templateHeaders.map(esc).join(",") + "\n" + cfg.templateExample.map(esc).join(",") + "\n";
}

export function importDisplayColumns(entity: ImportEntity): string[] {
  return CONFIGS[entity].displayColumns;
}

export async function previewImport(
  tenantId: string,
  entity: ImportEntity,
  buf: Buffer,
): Promise<PreviewResult> {
  switch (entity) {
    case "licensees":
      return doPreview(licenseeConfig, tenantId, entity, buf);
    case "catalog":
      return doPreview(catalogConfig, tenantId, entity, buf);
    case "suppliers":
      return doPreview(supplierConfig, tenantId, entity, buf);
  }
}

async function doPreview<V>(
  cfg: EntityConfig<V>,
  tenantId: string,
  entity: ImportEntity,
  buf: Buffer,
): Promise<PreviewResult> {
  const { rows } = parseBuffer(buf);
  if (rows.length === 0) {
    return {
      ok: false,
      error: "Nenhuma linha de dados encontrada. Verifique se a 1ª linha é o cabeçalho.",
      entity,
      displayColumns: cfg.displayColumns,
      summary: { total: 0, valid: 0, duplicates: 0, errors: 0 },
      rows: [],
      shownRows: 0,
    };
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      error: `Arquivo com ${rows.length} linhas excede o limite de ${MAX_IMPORT_ROWS} por importação.`,
      entity,
      displayColumns: cfg.displayColumns,
      summary: { total: rows.length, valid: 0, duplicates: 0, errors: 0 },
      rows: [],
      shownRows: 0,
    };
  }
  const ctx = await cfg.loadContext(tenantId);
  const seen = new Set<string>();
  const out: PreviewRow[] = [];
  let valid = 0;
  let duplicates = 0;
  let errorCount = 0;

  rows.forEach((raw, i) => {
    const line = i + 1;
    const built = cfg.buildRow(raw, ctx);
    if (!built.ok) {
      errorCount++;
      out.push({ line, status: "error", label: built.label, messages: built.errors, cells: built.cells });
      return;
    }
    const key = built.dupKey;
    const isDup = !!key && (ctx.existing.has(key) || seen.has(key));
    if (key) seen.add(key);
    if (isDup) {
      duplicates++;
      out.push({ line, status: "duplicate", label: built.label, messages: ["Já existe (será ignorado)."], cells: built.cells });
    } else {
      valid++;
      out.push({ line, status: "ok", label: built.label, messages: built.warnings, cells: built.cells });
    }
  });

  return {
    ok: true,
    entity,
    displayColumns: cfg.displayColumns,
    summary: { total: rows.length, valid, duplicates, errors: errorCount },
    rows: out.slice(0, MAX_PREVIEW_ROWS),
    shownRows: Math.min(out.length, MAX_PREVIEW_ROWS),
  };
}

export async function commitImport(
  tenantId: string,
  entity: ImportEntity,
  buf: Buffer,
  userId: string,
): Promise<CommitResult> {
  switch (entity) {
    case "licensees":
      return doCommit(licenseeConfig, tenantId, buf, userId);
    case "catalog":
      return doCommit(catalogConfig, tenantId, buf, userId);
    case "suppliers":
      return doCommit(supplierConfig, tenantId, buf, userId);
  }
}

async function doCommit<V>(
  cfg: EntityConfig<V>,
  tenantId: string,
  buf: Buffer,
  userId: string,
): Promise<CommitResult> {
  const { rows } = parseBuffer(buf);
  if (rows.length === 0) return { ok: false, error: "Arquivo vazio.", inserted: 0, skippedDuplicates: 0, failed: 0, failures: [] };
  if (rows.length > MAX_IMPORT_ROWS) {
    return { ok: false, error: `Excede ${MAX_IMPORT_ROWS} linhas.`, inserted: 0, skippedDuplicates: 0, failed: 0, failures: [] };
  }
  const ctx = await cfg.loadContext(tenantId);
  const seen = new Set<string>();
  let inserted = 0;
  let skippedDuplicates = 0;
  let failed = 0;
  const failures: CommitResult["failures"] = [];

  for (let i = 0; i < rows.length; i++) {
    const line = i + 1;
    const built = cfg.buildRow(rows[i], ctx);
    if (!built.ok) {
      failed++;
      failures.push({ line, label: built.label, message: built.errors.join(" ") });
      continue;
    }
    const key = built.dupKey;
    if (key && (ctx.existing.has(key) || seen.has(key))) {
      skippedDuplicates++;
      if (key) seen.add(key);
      continue;
    }
    if (key) seen.add(key);
    try {
      await cfg.create(tenantId, built.value, userId);
      inserted++;
    } catch (e) {
      failed++;
      failures.push({ line, label: built.label, message: e instanceof Error ? e.message : "Falha ao gravar." });
    }
  }

  return { ok: true, inserted, skippedDuplicates, failed, failures: failures.slice(0, 50) };
}
