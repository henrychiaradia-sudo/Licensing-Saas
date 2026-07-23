import "server-only";
import { and, eq, isNull, ilike, desc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { licensee, segment, country, type LicenseeStatus, type RiskRating } from "@/lib/db/schema";

export type LicenseeInput = {
  legalName: string;
  tradeName?: string | null;
  taxId?: string | null;
  countryId?: string | null;
  state?: string | null;
  city?: string | null;
  segmentId?: string | null;
  website?: string | null;
  riskRating?: RiskRating | null;
  financialScore?: number | null;
  status: LicenseeStatus;
};

function normalize(d: LicenseeInput) {
  return {
    legalName: d.legalName,
    tradeName: d.tradeName || null,
    taxId: d.taxId || null,
    countryId: d.countryId || null,
    state: d.state || null,
    city: d.city || null,
    segmentId: d.segmentId || null,
    website: d.website || null,
    riskRating: d.riskRating || null,
    financialScore: d.financialScore === null || d.financialScore === undefined ? null : String(d.financialScore),
    status: d.status,
  };
}

export async function listLicensees(tenantId: string, q?: string) {
  return db
    .select({
      id: licensee.id,
      legalName: licensee.legalName,
      tradeName: licensee.tradeName,
      financialScore: licensee.financialScore,
      status: licensee.status,
      segmentName: segment.name,
      countryName: country.name,
    })
    .from(licensee)
    .leftJoin(segment, eq(segment.id, licensee.segmentId))
    .leftJoin(country, eq(country.id, licensee.countryId))
    .where(
      and(
        eq(licensee.tenantId, tenantId),
        isNull(licensee.deletedAt),
        q ? ilike(licensee.legalName, `%${q}%`) : undefined,
      ),
    )
    .orderBy(desc(licensee.createdAt))
    .limit(200);
}

export async function getLicensee(tenantId: string, id: string) {
  const rows = await db
    .select()
    .from(licensee)
    .where(and(eq(licensee.id, id), eq(licensee.tenantId, tenantId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createLicensee(tenantId: string, data: LicenseeInput) {
  await db.insert(licensee).values({ tenantId, ...normalize(data) });
}

export async function updateLicensee(tenantId: string, id: string, data: LicenseeInput) {
  await db
    .update(licensee)
    .set({ ...normalize(data), updatedAt: new Date() })
    .where(and(eq(licensee.id, id), eq(licensee.tenantId, tenantId)));
}

export async function softDeleteLicensee(tenantId: string, id: string) {
  await db
    .update(licensee)
    .set({ deletedAt: new Date() })
    .where(and(eq(licensee.id, id), eq(licensee.tenantId, tenantId)));
}

export async function listSegments(tenantId: string) {
  return db
    .select({ id: segment.id, name: segment.name })
    .from(segment)
    .where(eq(segment.tenantId, tenantId))
    .orderBy(segment.name);
}

export function listCountries() {
  return db.select({ id: country.id, name: country.name }).from(country).orderBy(country.name);
}

export async function countLicensees(tenantId: string) {
  const rows = await db
    .select({ c: count() })
    .from(licensee)
    .where(and(eq(licensee.tenantId, tenantId), isNull(licensee.deletedAt)));
  return rows[0]?.c ?? 0;
}
