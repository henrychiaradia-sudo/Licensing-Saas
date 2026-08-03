import "server-only";
import { and, eq, desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { asset, assetDownload, brand } from "@/lib/db/schema";

export async function listAssets(tenantId: string, opts?: { brandId?: string }) {
  const conds = [eq(asset.tenantId, tenantId)];
  if (opts?.brandId) conds.push(eq(asset.brandId, opts.brandId));
  return db
    .select({
      id: asset.id,
      name: asset.name,
      assetType: asset.assetType,
      currentVersion: asset.currentVersion,
      sizeBytes: asset.sizeBytes,
      tags: asset.tags,
      brandName: brand.name,
      updatedAt: asset.updatedAt,
      downloads: sql<number>`count(${assetDownload.id})::int`,
    })
    .from(asset)
    .leftJoin(brand, eq(brand.id, asset.brandId))
    .leftJoin(assetDownload, eq(assetDownload.assetId, asset.id))
    .where(and(...conds))
    .groupBy(asset.id, brand.name)
    .orderBy(desc(asset.createdAt));
}

export async function logDownload(tenantId: string, assetId: string, userId: string) {
  const rows = await db
    .select({ id: asset.id, version: asset.currentVersion })
    .from(asset)
    .where(and(eq(asset.id, assetId), eq(asset.tenantId, tenantId)))
    .limit(1);
  if (!rows[0]) return;
  await db.insert(assetDownload).values({
    tenantId,
    assetId,
    assetVersion: rows[0].version,
    downloadedBy: userId,
    purpose: "download",
  });
}
