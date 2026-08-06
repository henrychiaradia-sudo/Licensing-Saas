import "server-only";
import { randomBytes } from "node:crypto";
import { and, eq, desc, isNull, count, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  generatedDocument,
  licensee,
  tenant,
  country,
  royaltyRule,
  type DocumentType,
  type DocumentStatus,
} from "@/lib/db/schema";
import { getContractDetail } from "./contracts";
import { getRoyaltyReportDetail } from "./royalties";
import { buildContractPdf, type ContractPdfData } from "@/lib/pdf/contract";
import { buildRoyaltyStatementPdf, type RoyaltyPdfData } from "@/lib/pdf/royalty-statement";
import { appendSignatureCertificate } from "@/lib/pdf/certificate";
import { sha256Hex } from "@/lib/pdf/layout";

/* --------------------------------- rótulos -------------------------------- */

const CONTRACT_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  em_aprovacao: "Em aprovação",
  vigente: "Vigente",
  suspenso: "Suspenso",
  renovado: "Renovado",
  expirado: "Expirado",
  encerrado: "Encerrado",
};
const EXCLUSIVITY_LABEL: Record<string, string> = {
  exclusivo: "Exclusivo",
  nao_exclusivo: "Não exclusivo",
};
const ROYALTY_TYPE_LABEL: Record<string, string> = {
  percentual: "Percentual",
  fixo: "Fixo",
  hibrido: "Híbrido",
  escalonado: "Escalonado",
};
const ROYALTY_BASE_LABEL: Record<string, string> = {
  gross_sales: "Vendas brutas",
  net_sales: "Vendas líquidas",
  units: "Unidades",
};
const FEE_TYPE_LABEL: Record<string, string> = {
  initial: "Taxa inicial",
  annual: "Anual",
  marketing: "Marketing",
  renewal: "Renovação",
  penalty: "Multa",
  other: "Outros",
};
const REPORT_STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  em_validacao: "Em validação",
  com_divergencia: "Com divergência",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
};
export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  rascunho: "Rascunho",
  aguardando_assinatura: "Aguardando assinatura",
  assinado: "Assinado",
  cancelado: "Cancelado",
};
export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  contrato_licenciamento: "Contrato de licenciamento",
  extrato_royalties: "Extrato de royalties",
};

/* -------------------------------- utilidades ------------------------------ */

const B32 = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem I, L, O, 0, 1
function code4(): string {
  const b = randomBytes(4);
  let s = "";
  for (let i = 0; i < 4; i++) s += B32[b[i] % B32.length];
  return s;
}
function genVerificationCode(): string {
  return `ALZ-${code4()}-${code4()}`;
}

/** Mascara o CPF preservando privacidade (LGPD): ***.456.789-**. */
export function maskCpf(cpf: string | null | undefined): string {
  if (!cpf) return "-";
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

async function nextDocNumber(tenantId: string): Promise<string> {
  const [row] = await db
    .select({ c: count() })
    .from(generatedDocument)
    .where(eq(generatedDocument.tenantId, tenantId));
  const seq = (row?.c ?? 0) + 1;
  const year = new Date().getFullYear();
  return `DOC-${year}-${String(seq).padStart(5, "0")}`;
}

async function tenantName(tenantId: string): Promise<{ name: string; legalName: string | null }> {
  const [t] = await db
    .select({ name: tenant.name, legalName: tenant.legalName })
    .from(tenant)
    .where(eq(tenant.id, tenantId))
    .limit(1);
  return t ?? { name: "ALIANZA", legalName: null };
}

async function licenseeInfo(id: string) {
  if (!id) return null;
  const [l] = await db
    .select({
      legalName: licensee.legalName,
      taxId: licensee.taxId,
      city: licensee.city,
      state: licensee.state,
      countryName: country.name,
    })
    .from(licensee)
    .leftJoin(country, eq(country.id, licensee.countryId))
    .where(eq(licensee.id, id))
    .limit(1);
  return l ?? null;
}

/* ---------------------------- geração de documentos ----------------------- */

export async function generateContractDocument(
  tenantId: string,
  contractId: string,
  userId: string,
): Promise<{ id: string }> {
  const detail = await getContractDetail(tenantId, contractId);
  if (!detail) throw new Error("Contrato não encontrado.");
  const c = detail.contract;
  const [lic, ten] = await Promise.all([licenseeInfo(c.licenseeId), tenantName(tenantId)]);
  const [rule] = await db
    .select()
    .from(royaltyRule)
    .where(and(eq(royaltyRule.contractId, contractId), eq(royaltyRule.isActive, true)))
    .orderBy(desc(royaltyRule.createdAt))
    .limit(1);

  const number = await nextDocNumber(tenantId);
  const verificationCode = genVerificationCode();

  const data: ContractPdfData = {
    number,
    issuedAt: new Date(),
    verificationCode,
    licensor: { name: ten.name, legalName: ten.legalName },
    licensee: {
      legalName: lic?.legalName ?? c.licenseeName ?? "-",
      taxId: lic?.taxId ?? null,
      city: lic?.city ?? null,
      state: lic?.state ?? null,
      country: lic?.countryName ?? null,
    },
    contractNumber: c.contractNumber,
    statusLabel: CONTRACT_STATUS_LABEL[c.status] ?? c.status,
    exclusivityLabel: EXCLUSIVITY_LABEL[c.exclusivity] ?? c.exclusivity,
    signingDate: c.signingDate,
    startDate: c.startDate,
    endDate: c.endDate,
    autoRenewal: c.autoRenewal,
    renewalTermMonths: c.renewalTermMonths,
    currencyIso: c.currencyIso ?? "BRL",
    minimumGuaranteeTotal: c.minimumGuaranteeTotal,
    brands: detail.brands.map((b) => b.name).filter((n): n is string => !!n),
    territories: detail.territories.map((t) => ({ name: t.name ?? "-", isExclusive: !!t.isExclusive })),
    royalty: rule
      ? {
          typeLabel: ROYALTY_TYPE_LABEL[rule.royaltyType] ?? rule.royaltyType,
          baseLabel: ROYALTY_BASE_LABEL[rule.base] ?? rule.base,
          percentage: rule.percentage,
          fixedAmount: rule.fixedAmount,
          minRoyalty: rule.minRoyalty,
          maxRoyalty: rule.maxRoyalty,
        }
      : null,
    fees: detail.fees.map((f) => ({
      typeLabel: FEE_TYPE_LABEL[f.feeType] ?? f.feeType,
      amount: f.amount,
      currencyIso: f.currencyIso ?? c.currencyIso ?? "BRL",
      dueDate: f.dueDate,
    })),
    insuranceRequired: c.insuranceRequired,
    insuranceInfo: c.insuranceInfo,
    notes: c.notes,
  };

  const bytes = await buildContractPdf(data);
  const sourceSha256 = await sha256Hex(bytes);

  const [ins] = await db
    .insert(generatedDocument)
    .values({
      tenantId,
      docType: "contrato_licenciamento",
      sourceType: "contract",
      sourceId: contractId,
      licenseeId: c.licenseeId,
      title: `Contrato de Licenciamento ${c.contractNumber}`,
      number,
      status: "rascunho",
      content: Buffer.from(bytes),
      sourceSha256,
      verificationCode,
      createdBy: userId,
    })
    .returning({ id: generatedDocument.id });
  return { id: ins.id };
}

export async function generateRoyaltyDocument(
  tenantId: string,
  reportId: string,
  userId: string,
): Promise<{ id: string }> {
  const detail = await getRoyaltyReportDetail(tenantId, reportId);
  if (!detail) throw new Error("Relatório de royalties não encontrado.");
  const r = detail.report;
  const lic = await licenseeInfo(r.licenseeId ?? "");

  const number = await nextDocNumber(tenantId);
  const verificationCode = genVerificationCode();

  const data: RoyaltyPdfData = {
    number,
    issuedAt: new Date(),
    verificationCode,
    licensee: { legalName: lic?.legalName ?? r.licenseeName ?? "-", taxId: lic?.taxId ?? null },
    contractNumber: r.contractNumber,
    referenceLabel: r.referenceLabel,
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    currencyIso: r.currencyIso ?? "BRL",
    statusLabel: REPORT_STATUS_LABEL[r.status] ?? r.status,
    grossSalesTotal: r.grossSalesTotal,
    netSalesTotal: r.netSalesTotal,
    unitsTotal: r.unitsTotal,
    royaltyDeclared: r.royaltyDeclared,
    royaltyCalculated: r.royaltyCalculated,
    variance: r.variance,
    lines: detail.lines.map((l) => ({
      sku: l.sku,
      productName: l.productName,
      units: l.units,
      netAmount: l.netAmount,
      royaltyBaseAmt: l.royaltyBaseAmt,
      royaltyRate: l.royaltyRate,
      royaltyAmount: l.royaltyAmount,
    })),
  };

  const bytes = await buildRoyaltyStatementPdf(data);
  const sourceSha256 = await sha256Hex(bytes);

  const [ins] = await db
    .insert(generatedDocument)
    .values({
      tenantId,
      docType: "extrato_royalties",
      sourceType: "royalty_report",
      sourceId: reportId,
      licenseeId: r.licenseeId!,
      title: `Extrato de Royalties ${r.referenceLabel}`,
      number,
      status: "rascunho",
      content: Buffer.from(bytes),
      sourceSha256,
      verificationCode,
      createdBy: userId,
    })
    .returning({ id: generatedDocument.id });
  return { id: ins.id };
}

/* --------------------------------- listagens ------------------------------ */

const META = {
  id: generatedDocument.id,
  docType: generatedDocument.docType,
  sourceType: generatedDocument.sourceType,
  sourceId: generatedDocument.sourceId,
  licenseeId: generatedDocument.licenseeId,
  title: generatedDocument.title,
  number: generatedDocument.number,
  status: generatedDocument.status,
  verificationCode: generatedDocument.verificationCode,
  signerName: generatedDocument.signerName,
  signedAt: generatedDocument.signedAt,
  sentAt: generatedDocument.sentAt,
  createdAt: generatedDocument.createdAt,
} as const;

export type DocumentMeta = {
  id: string;
  docType: DocumentType;
  sourceType: string;
  sourceId: string;
  licenseeId: string;
  title: string;
  number: string;
  status: DocumentStatus;
  verificationCode: string;
  signerName: string | null;
  signedAt: Date | null;
  sentAt: Date | null;
  createdAt: Date;
  licenseeName?: string | null;
};

export async function listDocuments(
  tenantId: string,
  opts?: { status?: DocumentStatus; sourceType?: string },
): Promise<DocumentMeta[]> {
  const conds = [eq(generatedDocument.tenantId, tenantId), isNull(generatedDocument.deletedAt)];
  if (opts?.status) conds.push(eq(generatedDocument.status, opts.status));
  if (opts?.sourceType) conds.push(eq(generatedDocument.sourceType, opts.sourceType));
  return db
    .select({ ...META, licenseeName: licensee.legalName })
    .from(generatedDocument)
    .leftJoin(licensee, eq(licensee.id, generatedDocument.licenseeId))
    .where(and(...conds))
    .orderBy(desc(generatedDocument.createdAt))
    .limit(300);
}

export async function listDocumentsForSource(
  tenantId: string,
  sourceType: string,
  sourceId: string,
): Promise<DocumentMeta[]> {
  return db
    .select(META)
    .from(generatedDocument)
    .where(
      and(
        eq(generatedDocument.tenantId, tenantId),
        eq(generatedDocument.sourceType, sourceType),
        eq(generatedDocument.sourceId, sourceId),
        isNull(generatedDocument.deletedAt),
      ),
    )
    .orderBy(desc(generatedDocument.createdAt));
}

export async function getDocumentMeta(tenantId: string, id: string): Promise<DocumentMeta | null> {
  const [row] = await db
    .select({ ...META, licenseeName: licensee.legalName })
    .from(generatedDocument)
    .leftJoin(licensee, eq(licensee.id, generatedDocument.licenseeId))
    .where(
      and(
        eq(generatedDocument.id, id),
        eq(generatedDocument.tenantId, tenantId),
        isNull(generatedDocument.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Bytes do PDF para download (escopo por tenant; verificação de licenciado no chamador). */
export async function getDocumentForDownload(tenantId: string, id: string) {
  const [row] = await db
    .select({
      content: generatedDocument.content,
      title: generatedDocument.title,
      status: generatedDocument.status,
      licenseeId: generatedDocument.licenseeId,
      number: generatedDocument.number,
    })
    .from(generatedDocument)
    .where(
      and(
        eq(generatedDocument.id, id),
        eq(generatedDocument.tenantId, tenantId),
        isNull(generatedDocument.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

/* ------------------------------ transições de status ---------------------- */

export async function sendForSignature(
  tenantId: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await db
    .update(generatedDocument)
    .set({ status: "aguardando_assinatura", sentAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(generatedDocument.id, id),
        eq(generatedDocument.tenantId, tenantId),
        eq(generatedDocument.status, "rascunho"),
        isNull(generatedDocument.deletedAt),
      ),
    )
    .returning({ id: generatedDocument.id });
  if (!res.length) return { ok: false, error: "Documento não está em rascunho." };
  return { ok: true };
}

export async function cancelDocument(
  tenantId: string,
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await db
    .update(generatedDocument)
    .set({ status: "cancelado", cancelledAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(generatedDocument.id, id),
        eq(generatedDocument.tenantId, tenantId),
        sql`${generatedDocument.status} in ('rascunho','aguardando_assinatura')`,
        isNull(generatedDocument.deletedAt),
      ),
    )
    .returning({ id: generatedDocument.id });
  if (!res.length) return { ok: false, error: "Documento não pode ser cancelado neste status." };
  return { ok: true };
}

/* --------------------------------- assinatura ----------------------------- */

export async function signDocument(args: {
  tenantId: string;
  licenseeId: string;
  id: string;
  signerName: string;
  signerCpf: string;
  signerEmail?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<{ ok: boolean; error?: string; code?: string }> {
  const [doc] = await db
    .select()
    .from(generatedDocument)
    .where(
      and(
        eq(generatedDocument.id, args.id),
        eq(generatedDocument.tenantId, args.tenantId),
        isNull(generatedDocument.deletedAt),
      ),
    )
    .limit(1);
  if (!doc) return { ok: false, error: "Documento não encontrado." };
  if (doc.licenseeId !== args.licenseeId)
    return { ok: false, error: "Documento não pertence a este licenciado." };
  if (doc.status !== "aguardando_assinatura")
    return { ok: false, error: "Documento não está aguardando assinatura." };

  const lic = await licenseeInfo(doc.licenseeId);
  const signedAt = new Date();
  const signedBytes = await appendSignatureCertificate(doc.content, {
    title: doc.title,
    number: doc.number,
    licenseeName: lic?.legalName ?? "-",
    sourceSha256: doc.sourceSha256,
    verificationCode: doc.verificationCode,
    signerName: args.signerName,
    signerCpf: args.signerCpf,
    signerEmail: args.signerEmail ?? null,
    signedAt,
    signerIp: args.ip ?? null,
    signerUserAgent: args.userAgent ?? null,
  });
  const signedSha256 = await sha256Hex(signedBytes);

  await db
    .update(generatedDocument)
    .set({
      status: "assinado",
      content: Buffer.from(signedBytes),
      signedSha256,
      signerName: args.signerName,
      signerCpf: args.signerCpf,
      signerEmail: args.signerEmail ?? null,
      signedAt,
      signerIp: args.ip ?? null,
      signerUserAgent: args.userAgent ?? null,
      updatedAt: new Date(),
    })
    .where(eq(generatedDocument.id, args.id));

  return { ok: true, code: doc.verificationCode };
}

/* --------------------------- portal do licenciado ------------------------- */

export async function listLicenseeDocuments(
  tenantId: string,
  licenseeId: string,
): Promise<DocumentMeta[]> {
  return db
    .select(META)
    .from(generatedDocument)
    .where(
      and(
        eq(generatedDocument.tenantId, tenantId),
        eq(generatedDocument.licenseeId, licenseeId),
        sql`${generatedDocument.status} in ('aguardando_assinatura','assinado','cancelado')`,
        isNull(generatedDocument.deletedAt),
      ),
    )
    .orderBy(desc(generatedDocument.createdAt));
}

export async function getLicenseeDocument(
  tenantId: string,
  licenseeId: string,
  id: string,
): Promise<DocumentMeta | null> {
  const [row] = await db
    .select(META)
    .from(generatedDocument)
    .where(
      and(
        eq(generatedDocument.id, id),
        eq(generatedDocument.tenantId, tenantId),
        eq(generatedDocument.licenseeId, licenseeId),
        isNull(generatedDocument.deletedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

/* ------------------------------ verificação pública ----------------------- */

export type VerifyResult = {
  found: true;
  title: string;
  number: string;
  docTypeLabel: string;
  status: DocumentStatus;
  statusLabel: string;
  licenseeName: string | null;
  issuedAt: Date;
  signerName: string | null;
  signerCpfMasked: string | null;
  signedAt: Date | null;
  sourceSha256: string;
  verificationCode: string;
};

export async function verifyDocument(code: string): Promise<VerifyResult | null> {
  const clean = code.trim().toUpperCase();
  if (!clean) return null;
  // Busca pública por código de verificação (entre empresas). Sob RLS, usa uma
  // função SECURITY DEFINER dedicada. Sem RLS, funciona igual.
  const found = (await db.execute(
    sql`select * from verify_document_by_code(${clean})`,
  )) as unknown as Array<Record<string, unknown>>;
  const row = found[0];
  if (!row) return null;
  const docType = row.doc_type as DocumentType;
  const status = row.status as DocumentStatus;
  return {
    found: true,
    title: row.title as string,
    number: row.number as string,
    docTypeLabel: DOCUMENT_TYPE_LABEL[docType] ?? String(row.doc_type),
    status,
    statusLabel: DOCUMENT_STATUS_LABEL[status] ?? String(row.status),
    licenseeName: (row.licensee_name as string | null) ?? null,
    issuedAt: row.issued_at as Date,
    signerName: (row.signer_name as string | null) ?? null,
    signerCpfMasked: maskCpf(row.signer_cpf as string | null),
    signedAt: (row.signed_at as Date | null) ?? null,
    sourceSha256: row.source_sha256 as string,
    verificationCode: row.verification_code as string,
  };
}
