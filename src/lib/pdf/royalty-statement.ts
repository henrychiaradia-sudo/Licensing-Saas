import "server-only";
import { Doc, COLORS, fmtDateBR, fmtMoneyBR, fmtNum } from "./layout";

export type RoyaltyPdfData = {
  number: string;
  issuedAt: Date;
  verificationCode: string;
  licensee: { legalName: string; taxId?: string | null };
  contractNumber?: string | null;
  referenceLabel: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  currencyIso: string;
  statusLabel: string;
  grossSalesTotal?: string | null;
  netSalesTotal?: string | null;
  unitsTotal?: string | null;
  royaltyDeclared?: string | null;
  royaltyCalculated?: string | null;
  variance?: string | null;
  lines: {
    sku?: string | null;
    productName?: string | null;
    units?: string | null;
    netAmount?: string | null;
    royaltyBaseAmt?: string | null;
    royaltyRate?: string | null;
    royaltyAmount?: string | null;
  }[];
};

export async function buildRoyaltyStatementPdf(d: RoyaltyPdfData): Promise<Uint8Array> {
  const doc = await Doc.create("Extrato de Royalties", { verificationCode: d.verificationCode });

  doc.paragraph("EXTRATO DE ROYALTIES", { size: 15, bold: true, color: COLORS.navy, gapAfter: 2 });
  doc.paragraph(
    `Documento ${d.number}   ·   Emitido em ${fmtDateBR(d.issuedAt)}   ·   Competência ${d.referenceLabel}   ·   Situação: ${d.statusLabel}`,
    { size: 8.5, color: COLORS.muted, gapAfter: 4 },
  );

  doc.heading("Identificação");
  doc.fields([
    { label: "Licenciado", value: d.licensee.legalName },
    { label: "CNPJ / Tax ID", value: d.licensee.taxId || "-" },
    { label: "Contrato", value: d.contractNumber || "-" },
    { label: "Moeda", value: d.currencyIso },
    { label: "Início do período", value: fmtDateBR(d.periodStart) },
    { label: "Fim do período", value: fmtDateBR(d.periodEnd) },
  ]);

  doc.heading("Resumo da competência");
  doc.statRow([
    { label: "Vendas líquidas", value: fmtMoneyBR(d.netSalesTotal, d.currencyIso) },
    { label: "Unidades", value: fmtNum(d.unitsTotal, 0) },
    { label: "Royalty devido", value: fmtMoneyBR(d.royaltyCalculated, d.currencyIso), tone: COLORS.brand },
  ]);
  doc.space(8);
  doc.fields([
    { label: "Vendas brutas", value: fmtMoneyBR(d.grossSalesTotal, d.currencyIso) },
    { label: "Royalty declarado", value: fmtMoneyBR(d.royaltyDeclared, d.currencyIso) },
    {
      label: "Divergência (calculado − declarado)",
      value: fmtMoneyBR(d.variance, d.currencyIso),
    },
    { label: "Royalty calculado", value: fmtMoneyBR(d.royaltyCalculated, d.currencyIso) },
  ]);

  if (d.lines.length) {
    doc.heading("Detalhamento por item");
    doc.table(
      [
        { header: "SKU", width: 18 },
        { header: "Produto", width: 38 },
        { header: "Unid.", width: 12, align: "right" },
        { header: "Vendas líq.", width: 20, align: "right" },
        { header: "Taxa", width: 10, align: "right" },
        { header: "Royalty", width: 20, align: "right" },
      ],
      d.lines.map((l) => [
        l.sku || "-",
        l.productName || "-",
        fmtNum(l.units, 0),
        fmtMoneyBR(l.netAmount, d.currencyIso),
        l.royaltyRate ? `${fmtNum(l.royaltyRate, 2)}%` : "-",
        fmtMoneyBR(l.royaltyAmount, d.currencyIso),
      ]),
    );
  } else {
    doc.paragraph("Sem itens detalhados para esta competência.", { size: 9, color: COLORS.muted });
  }

  doc.space(10);
  doc.paragraph(
    "Este extrato reflete os valores reportados e calculados na competência indicada. Quando enviado para assinatura, o aceite eletrônico do LICENCIADO é registrado no Certificado de Assinatura Eletrônica anexado, verificável pelo código impresso no rodapé.",
    { size: 8.5, color: COLORS.muted },
  );

  return doc.finish();
}
