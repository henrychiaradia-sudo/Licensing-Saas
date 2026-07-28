import "server-only";
import { and, eq, desc, asc, sql, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { catalogItem, category, brand } from "@/lib/db/schema";
import type { CatalogItemStatus } from "@/lib/db/schema";

export async function listCatalogItems(
  tenantId: string,
  opts?: { status?: CatalogItemStatus; categoryId?: string; q?: string },
) {
  const conds = [eq(catalogItem.tenantId, tenantId)];
  if (opts?.status) conds.push(eq(catalogItem.status, opts.status));
  if (opts?.categoryId) conds.push(eq(catalogItem.categoryId, opts.categoryId));
  if (opts?.q && opts.q.trim()) {
    const term = `%${opts.q.trim()}%`;
    const m = or(ilike(catalogItem.sku, term), ilike(catalogItem.name, term));
    if (m) conds.push(m);
  }
  return db
    .select({
      id: catalogItem.id,
      sku: catalogItem.sku,
      name: catalogItem.name,
      unit: catalogItem.unit,
      listPrice: catalogItem.listPrice,
      status: catalogItem.status,
      ncm: catalogItem.ncm,
      categoryName: category.name,
      brandName: brand.name,
    })
    .from(catalogItem)
    .leftJoin(category, eq(category.id, catalogItem.categoryId))
    .leftJoin(brand, eq(brand.id, catalogItem.brandId))
    .where(and(...conds))
    .orderBy(asc(catalogItem.sku))
    .limit(500);
}

export async function catalogSummary(tenantId: string) {
  const r = await db
    .select({
      total: sql<string>`count(*)`,
      active: sql<string>`count(*) filter (where ${catalogItem.status} = 'ativo')`,
      discontinued: sql<string>`count(*) filter (where ${catalogItem.status} = 'descontinuado')`,
    })
    .from(catalogItem)
    .where(eq(catalogItem.tenantId, tenantId));
  return {
    total: Number(r[0]?.total ?? 0),
    active: Number(r[0]?.active ?? 0),
    discontinued: Number(r[0]?.discontinued ?? 0),
  };
}

export async function getCatalogItemDetail(tenantId: string, id: string) {
  const rows = await db
    .select({
      id: catalogItem.id,
      sku: catalogItem.sku,
      name: catalogItem.name,
      description: catalogItem.description,
      unit: catalogItem.unit,
      listPrice: catalogItem.listPrice,
      status: catalogItem.status,
      ncm: catalogItem.ncm,
      cest: catalogItem.cest,
      categoryName: category.name,
      brandName: brand.name,
    })
    .from(catalogItem)
    .leftJoin(category, eq(category.id, catalogItem.categoryId))
    .leftJoin(brand, eq(brand.id, catalogItem.brandId))
    .where(and(eq(catalogItem.id, id), eq(catalogItem.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

export type CatalogItemInput = {
  sku: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  brandId: string | null;
  ncm: string | null;
  cest: string | null;
  unit: string;
  listPrice: number;
  status: CatalogItemStatus;
};

export async function createCatalogItem(
  tenantId: string,
  input: CatalogItemInput,
  userId: string,
): Promise<{ id: string }> {
  const dup = await db
    .select({ id: catalogItem.id })
    .from(catalogItem)
    .where(and(eq(catalogItem.tenantId, tenantId), eq(catalogItem.sku, input.sku)))
    .limit(1);
  if (dup[0]) throw new Error("Já existe um item com este SKU.");
  const inserted = await db
    .insert(catalogItem)
    .values({
      tenantId,
      sku: input.sku,
      name: input.name,
      description: input.description,
      categoryId: input.categoryId,
      brandId: input.brandId,
      ncm: input.ncm,
      cest: input.cest,
      unit: input.unit,
      listPrice: input.listPrice.toFixed(2),
      status: input.status,
      createdBy: userId,
    })
    .returning({ id: catalogItem.id });
  return { id: inserted[0].id };
}

/* ---------------------------------------------------------------------------
 * Categorias (árvore hierárquica)
 * ------------------------------------------------------------------------- */

export type CategoryNode = {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  itemCount: number;
  children: CategoryNode[];
};

export async function listCategoryTree(tenantId: string): Promise<CategoryNode[]> {
  const cats = await db
    .select({ id: category.id, name: category.name, code: category.code, parentId: category.parentId })
    .from(category)
    .where(eq(category.tenantId, tenantId))
    .orderBy(asc(category.name));

  const counts = await db
    .select({ categoryId: catalogItem.categoryId, c: sql<string>`count(*)` })
    .from(catalogItem)
    .where(eq(catalogItem.tenantId, tenantId))
    .groupBy(catalogItem.categoryId);
  const countMap = new Map<string, number>();
  for (const row of counts) if (row.categoryId) countMap.set(row.categoryId, Number(row.c));

  const nodes = new Map<string, CategoryNode>();
  for (const c of cats) {
    nodes.set(c.id, { ...c, itemCount: countMap.get(c.id) ?? 0, children: [] });
  }
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function listCategoryOptions(tenantId: string) {
  return db
    .select({ id: category.id, name: category.name, parentId: category.parentId })
    .from(category)
    .where(eq(category.tenantId, tenantId))
    .orderBy(asc(category.name));
}

export async function createCategory(
  tenantId: string,
  input: { name: string; code: string | null; parentId: string | null },
): Promise<void> {
  if (input.parentId) {
    const p = await db
      .select({ id: category.id })
      .from(category)
      .where(and(eq(category.id, input.parentId), eq(category.tenantId, tenantId)))
      .limit(1);
    if (!p[0]) throw new Error("Categoria-mãe inválida.");
  }
  await db.insert(category).values({
    tenantId,
    name: input.name,
    code: input.code,
    parentId: input.parentId,
  });
}
