import { describe, it, expect } from "vitest";
import { buildContractPdf } from "@/lib/pdf/contract";
import { buildRoyaltyStatementPdf } from "@/lib/pdf/royalty-statement";
import { appendSignatureCertificate } from "@/lib/pdf/certificate";
import { sha256Hex } from "@/lib/pdf/layout";

const isPdf = (b: Uint8Array) =>
  b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46; // %PDF

describe("motor de PDF — geração branded + certificado", () => {
  it("gera um contrato com acentos pt-BR sem quebrar (WinAnsi)", async () => {
    const bytes = await buildContractPdf({
      number: "DOC-2026-000001",
      issuedAt: new Date("2026-08-04T12:00:00Z"),
      verificationCode: "ALZ-TEST-0001",
      licensor: { name: "NovaSport Global", legalName: "NovaSport Global Ltda." },
      licensee: { legalName: "Comércio Ação Ltda.", taxId: "12.345.678/0001-90", city: "São Paulo", state: "SP", country: "Brasil" },
      contractNumber: "CT-2026-045",
      statusLabel: "Vigente",
      exclusivityLabel: "Não exclusivo",
      signingDate: "2026-01-10",
      startDate: "2026-02-01",
      endDate: "2027-01-31",
      autoRenewal: true,
      renewalTermMonths: 12,
      currencyIso: "BRL",
      minimumGuaranteeTotal: "150000.00",
      brands: ["Aurora", "Fusão"],
      territories: [{ name: "Brasil", isExclusive: true }, { name: "Mercosul", isExclusive: false }],
      royalty: { typeLabel: "Percentual", baseLabel: "Vendas líquidas", percentage: "5.0000", fixedAmount: null, minRoyalty: "1000.00", maxRoyalty: null },
      fees: [{ typeLabel: "Inicial", amount: "20000.00", currencyIso: "BRL", dueDate: "2026-02-15" }],
      insuranceRequired: true,
      insuranceInfo: "Apólice de responsabilidade civil.",
      notes: "Observação com cedilha e til: coração.",
    });
    expect(isPdf(bytes)).toBe(true);
    expect(bytes.length).toBeGreaterThan(1500);
  });

  it("gera um extrato de royalties com tabela de itens", async () => {
    const bytes = await buildRoyaltyStatementPdf({
      number: "DOC-2026-000002",
      issuedAt: new Date("2026-08-04T12:00:00Z"),
      verificationCode: "ALZ-TEST-0002",
      licensee: { legalName: "Comércio Ação Ltda.", taxId: "12.345.678/0001-90" },
      contractNumber: "CT-2026-045",
      referenceLabel: "2026-Q1",
      periodStart: "2026-01-01",
      periodEnd: "2026-03-31",
      currencyIso: "BRL",
      statusLabel: "Aprovado",
      grossSalesTotal: "500000.00",
      netSalesTotal: "450000.00",
      unitsTotal: "12000",
      royaltyDeclared: "22000.00",
      royaltyCalculated: "22500.00",
      variance: "500.00",
      lines: [
        { sku: "SKU-1", productName: "Camiseta Coração", units: "8000", netAmount: "300000.00", royaltyBaseAmt: "300000.00", royaltyRate: "5.0000", royaltyAmount: "15000.00" },
        { sku: "SKU-2", productName: "Boné Ação", units: "4000", netAmount: "150000.00", royaltyBaseAmt: "150000.00", royaltyRate: "5.0000", royaltyAmount: "7500.00" },
      ],
    });
    expect(isPdf(bytes)).toBe(true);
    expect(bytes.length).toBeGreaterThan(1500);
  });

  it("anexa o certificado de assinatura e mantém um PDF válido, maior que o original", async () => {
    const base = await buildContractPdf({
      number: "DOC-2026-000003",
      issuedAt: new Date("2026-08-04T12:00:00Z"),
      verificationCode: "ALZ-TEST-0003",
      licensor: { name: "NovaSport Global" },
      licensee: { legalName: "Comércio Ação Ltda." },
      contractNumber: "CT-2026-046",
      statusLabel: "Vigente",
      exclusivityLabel: "Exclusivo",
      autoRenewal: false,
      currencyIso: "BRL",
      brands: ["Aurora"],
      territories: [],
      royalty: null,
      fees: [],
      insuranceRequired: false,
      notes: null,
    });
    const signed = await appendSignatureCertificate(base, {
      title: "Contrato de Licenciamento CT-2026-046",
      number: "DOC-2026-000003",
      licenseeName: "Comércio Ação Ltda.",
      sourceSha256: await sha256Hex(base),
      verificationCode: "ALZ-TEST-0003",
      signerName: "João da Silva",
      signerCpf: "123.456.789-00",
      signerEmail: "joao@exemplo.com",
      signedAt: new Date("2026-08-05T09:30:00Z"),
      signerIp: "203.0.113.10",
      signerUserAgent: "Mozilla/5.0 (Macintosh)",
    });
    expect(isPdf(signed)).toBe(true);
    expect(signed.length).toBeGreaterThan(base.length);
  });

  it("sha256Hex é determinístico e sensível a alterações", async () => {
    const a = new Uint8Array([1, 2, 3, 4]);
    const b = new Uint8Array([1, 2, 3, 5]);
    expect(await sha256Hex(a)).toBe(await sha256Hex(a));
    expect(await sha256Hex(a)).not.toBe(await sha256Hex(b));
    expect(await sha256Hex(a)).toMatch(/^[0-9a-f]{64}$/);
  });
});
