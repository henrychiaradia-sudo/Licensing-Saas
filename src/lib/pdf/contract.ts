import "server-only";
import { Doc, COLORS, fmtDateBR, fmtMoneyBR, fmtNum } from "./layout";

export type ContractPdfData = {
  number: string;
  issuedAt: Date;
  verificationCode: string;
  licensor: { name: string; legalName?: string | null };
  licensee: {
    legalName: string;
    taxId?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  };
  contractNumber: string;
  statusLabel: string;
  exclusivityLabel: string;
  signingDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  autoRenewal: boolean;
  renewalTermMonths?: number | null;
  currencyIso: string;
  minimumGuaranteeTotal?: string | null;
  brands: string[];
  territories: { name: string; isExclusive: boolean }[];
  royalty?: {
    typeLabel: string;
    baseLabel?: string | null;
    percentage?: string | null;
    fixedAmount?: string | null;
    minRoyalty?: string | null;
    maxRoyalty?: string | null;
  } | null;
  fees: { typeLabel: string; amount: string | null; currencyIso: string; dueDate?: string | null }[];
  insuranceRequired: boolean;
  insuranceInfo?: string | null;
  notes?: string | null;
};

export async function buildContractPdf(d: ContractPdfData): Promise<Uint8Array> {
  const doc = await Doc.create("Contrato de Licenciamento", { verificationCode: d.verificationCode });

  doc.paragraph("CONTRATO DE LICENCIAMENTO DE MARCA", {
    size: 15,
    bold: true,
    color: COLORS.navy,
    gapAfter: 2,
  });
  doc.paragraph(
    `Documento ${d.number}   ·   Emitido em ${fmtDateBR(d.issuedAt)}   ·   Ref. contrato ${d.contractNumber}   ·   Situação: ${d.statusLabel}`,
    { size: 8.5, color: COLORS.muted, gapAfter: 4 },
  );

  // Partes
  doc.heading("1. Partes");
  doc.paragraph("LICENCIANTE (titular da marca)", { size: 7, bold: true, color: COLORS.faint, gapAfter: 1 });
  doc.paragraph(d.licensor.legalName || d.licensor.name, { size: 10, bold: true, gapAfter: 6 });
  doc.paragraph("LICENCIADO", { size: 7, bold: true, color: COLORS.faint, gapAfter: 1 });
  doc.paragraph(
    `${d.licensee.legalName}${d.licensee.taxId ? "   ·   CNPJ/Tax ID: " + d.licensee.taxId : ""}`,
    { size: 10, bold: true, gapAfter: 1 },
  );
  const loc = [d.licensee.city, d.licensee.state, d.licensee.country].filter(Boolean).join(" / ");
  if (loc) doc.paragraph(loc, { size: 9, color: COLORS.muted });

  // Objeto
  doc.heading("2. Objeto e escopo");
  doc.paragraph(
    "Pelo presente instrumento particular, o LICENCIANTE concede ao LICENCIADO, nos termos e condições aqui previstos, licença de uso das marcas abaixo indicadas, restrita às categorias, aos territórios e ao prazo de vigência estabelecidos neste contrato.",
    { gapAfter: 6 },
  );
  doc.fields([
    { label: "Marcas licenciadas", value: d.brands.join(", ") || "-" },
    { label: "Exclusividade", value: d.exclusivityLabel },
  ]);
  if (d.territories.length) {
    const terr = d.territories
      .map((t) => `${t.name}${t.isExclusive ? " (exclusivo)" : ""}`)
      .join(";  ");
    doc.paragraph(`Territórios: ${terr}`, { size: 9, color: COLORS.ink });
  }

  // Vigência
  doc.heading("3. Vigência");
  doc.fields([
    { label: "Data de assinatura", value: fmtDateBR(d.signingDate) },
    { label: "Início da vigência", value: fmtDateBR(d.startDate) },
    { label: "Término da vigência", value: fmtDateBR(d.endDate) },
    {
      label: "Renovação automática",
      value: d.autoRenewal
        ? `Sim${d.renewalTermMonths ? ` (${d.renewalTermMonths} meses)` : ""}`
        : "Não",
    },
  ]);

  // Royalties
  doc.heading("4. Royalties e contrapartidas financeiras");
  if (d.royalty) {
    doc.fields([
      { label: "Tipo de royalty", value: d.royalty.typeLabel },
      { label: "Base de cálculo", value: d.royalty.baseLabel || "-" },
      {
        label: "Percentual",
        value: d.royalty.percentage ? `${fmtNum(d.royalty.percentage, 2)}%` : "-",
      },
      {
        label: "Valor fixo",
        value: d.royalty.fixedAmount ? fmtMoneyBR(d.royalty.fixedAmount, d.currencyIso) : "-",
      },
      {
        label: "Royalty mínimo",
        value: d.royalty.minRoyalty ? fmtMoneyBR(d.royalty.minRoyalty, d.currencyIso) : "-",
      },
      {
        label: "Royalty máximo",
        value: d.royalty.maxRoyalty ? fmtMoneyBR(d.royalty.maxRoyalty, d.currencyIso) : "-",
      },
    ]);
  } else {
    doc.paragraph("Regra de royalty não configurada para este contrato.", {
      size: 9,
      color: COLORS.muted,
    });
  }
  doc.fields([
    {
      label: "Garantia mínima total",
      value: d.minimumGuaranteeTotal ? fmtMoneyBR(d.minimumGuaranteeTotal, d.currencyIso) : "-",
    },
    { label: "Moeda do contrato", value: d.currencyIso },
  ]);

  if (d.fees.length) {
    doc.paragraph("Taxas e obrigações financeiras", {
      size: 8.5,
      bold: true,
      color: COLORS.ink,
      gapAfter: 3,
    });
    doc.table(
      [
        { header: "Tipo", width: 40 },
        { header: "Valor", width: 30, align: "right" },
        { header: "Vencimento", width: 30, align: "right" },
      ],
      d.fees.map((f) => [
        f.typeLabel,
        fmtMoneyBR(f.amount, f.currencyIso),
        fmtDateBR(f.dueDate),
      ]),
    );
  }

  // Seguro
  if (d.insuranceRequired || d.insuranceInfo) {
    doc.heading("5. Seguro e garantias");
    doc.paragraph(
      d.insuranceRequired
        ? `O LICENCIADO obriga-se a manter seguro vigente durante toda a vigência.${d.insuranceInfo ? " " + d.insuranceInfo : ""}`
        : d.insuranceInfo || "-",
      { size: 9.5 },
    );
  }

  // Cláusulas gerais
  doc.heading("6. Cláusulas gerais");
  const clauses = [
    "6.1. Propriedade intelectual. As marcas licenciadas permanecem de titularidade exclusiva do LICENCIANTE, não implicando este contrato qualquer cessão de direitos além da licença de uso ora concedida.",
    "6.2. Aprovação de produtos. Todo produto que ostente as marcas licenciadas deverá ser previamente submetido à aprovação do LICENCIANTE, na forma dos fluxos da plataforma.",
    "6.3. Reporte e royalties. O LICENCIADO obriga-se a reportar vendas e recolher os royalties nas competências e prazos pactuados, sujeitando-se à auditoria pelo LICENCIANTE.",
    "6.4. Confidencialidade. As partes obrigam-se a manter sigilo sobre informações confidenciais a que tiverem acesso em razão deste contrato.",
    "6.5. Rescisão. O descumprimento de qualquer obrigação essencial faculta à parte inocente a rescisão, sem prejuízo das penalidades e da reparação por perdas e danos.",
    "6.6. Foro. Fica eleito o foro da comarca da sede do LICENCIANTE para dirimir controvérsias oriundas deste contrato, com renúncia a qualquer outro.",
  ];
  if (d.notes) clauses.push(`6.7. Observações. ${d.notes}`);
  for (const c of clauses) doc.paragraph(c, { size: 9, gapAfter: 4 });

  // Assinaturas
  doc.heading("7. Assinaturas");
  doc.paragraph(
    "As partes firmam o presente contrato por assinatura eletrônica, nos termos da legislação aplicável (MP 2.200-2/2001 e Lei 14.063/2020). A validade e a integridade da via assinada pelo LICENCIADO são atestadas pelo Certificado de Assinatura Eletrônica anexado a este documento após a assinatura, verificável pelo código impresso no rodapé.",
    { size: 9, gapAfter: 16 },
  );
  doc.signatureBlocks([
    { role: "LICENCIANTE", name: d.licensor.legalName || d.licensor.name, note: "NovaSport Global — emitido pela plataforma ALIANZA" },
    { role: "LICENCIADO", name: d.licensee.legalName, note: "Assinatura eletrônica registrada no Portal do Licenciado" },
  ]);

  return doc.finish();
}
