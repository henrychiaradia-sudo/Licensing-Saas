import "server-only";
import { and, eq, isNull, ilike, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { brand, type BrandStatus } from "@/lib/db/schema";

export type BrandInput = {
  code: string;
  name: string;
  ownerArea?: string | null;
  status: BrandStatus;
  language?: string | null;
  description?: string | null;
  validFrom?: string | null;
  validTo?: string | null;
};

function normalize(d: BrandInput) {
  return {
    code: d.code,
    name: d.name,
    ownerArea: d.ownerArea || null,
    status: d.status,
    language: d.language || null,
    description: d.description || null,
    validFrom: d.validFrom || null,
    validTo: d.validTo || null,
  };
}

export async function listBrands(tenantId: string, q?: string) {
  return db
    .select()
    .from(brand)
    .where(
      and(eq(brand.tenantId, tenantId), isNull(brand.deletedAt), q ? ilike(brand.name, `%${q}%`) : undefined),
    )
    .orderBy(desc(brand.createdAt))
    .limit(200);
}

export async function getBrand(tenantId: string, id: string) {
  const rows = await db
    .select()
    .from(brand)
    .where(and(eq(brand.id, id), eq(brand.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createBrand(tenantId: string, data: BrandInput) {
  await db.insert(brand).values({ tenantId, ...normalize(data) });
}

export async function updateBrand(tenantId: string, id: string, data: BrandInput) {
  await db
    .update(brand)
    .set({ ...normalize(data), updatedAt: new Date() })
    .where(and(eq(brand.id, id), eq(brand.tenantId, tenantId)));
}
