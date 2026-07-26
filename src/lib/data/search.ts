import "server-only";
import { and, eq, isNull, or, ilike } from "drizzle-orm";
import { db } from "@/lib/db";
import { contract, licensee, product, supplier, brand } from "@/lib/db/schema";

export async function globalSearch(tenantId: string, q: string) {
  const term = `%${q.trim()}%`;

  const contracts = await db
    .select({
      id: contract.id,
      contractNumber: contract.contractNumber,
      licenseeName: licensee.legalName,
    })
    .from(contract)
    .leftJoin(licensee, eq(licensee.id, contract.licenseeId))
    .where(
      and(
        eq(contract.tenantId, tenantId),
        isNull(contract.deletedAt),
        or(ilike(contract.contractNumber, term), ilike(licensee.legalName, term)),
      ),
    )
    .limit(8);

  const licensees = await db
    .select({ id: licensee.id, legalName: licensee.legalName })
    .from(licensee)
    .where(
      and(eq(licensee.tenantId, tenantId), isNull(licensee.deletedAt), ilike(licensee.legalName, term)),
    )
    .limit(8);

  const products = await db
    .select({ id: product.id, name: product.name, sku: product.sku, brandName: brand.name })
    .from(product)
    .leftJoin(brand, eq(brand.id, product.brandId))
    .where(
      and(
        eq(product.tenantId, tenantId),
        isNull(product.deletedAt),
        or(ilike(product.name, term), ilike(product.sku, term)),
      ),
    )
    .limit(8);

  const suppliers = await db
    .select({
      id: supplier.id,
      legalName: supplier.legalName,
      tradeName: supplier.tradeName,
      code: supplier.code,
    })
    .from(supplier)
    .where(
      and(
        eq(supplier.tenantId, tenantId),
        isNull(supplier.deletedAt),
        or(ilike(supplier.legalName, term), ilike(supplier.tradeName, term), ilike(supplier.code, term)),
      ),
    )
    .limit(8);

  return { contracts, licensees, products, suppliers };
}
