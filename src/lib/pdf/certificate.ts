import "server-only";
import { PDFDocument, StandardFonts, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { A4, MARGIN, COLORS, CONTENT_W, san, fmtDateTimeBR } from "./layout";

export type CertificateData = {
  title: string;
  number: string;
  licenseeName: string;
  sourceSha256: string;
  verificationCode: string;
  signerName: string;
  signerCpf: string;
  signerEmail?: string | null;
  signedAt: Date;
  signerIp?: string | null;
  signerUserAgent?: string | null;
};

/** Anexa uma página de Certificado de Assinatura Eletrônica ao PDF existente. */
export async function appendSignatureCertificate(
  pdfBytes: Uint8Array,
  sig: CertificateData,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([A4.w, A4.h]);

  // Faixa da marca
  const bandH = 64;
  const bandTop = A4.h - bandH;
  page.drawRectangle({ x: 0, y: bandTop, width: A4.w, height: bandH, color: COLORS.brand });
  page.drawRectangle({ x: MARGIN.left, y: bandTop + 20, width: 26, height: 26, color: COLORS.white });
  page.drawText("A", { x: MARGIN.left + 7.5, y: bandTop + 27, size: 16, font: bold, color: COLORS.brand });
  page.drawText("ALIANZA", { x: MARGIN.left + 36, y: bandTop + 34, size: 15, font: bold, color: COLORS.white });
  page.drawText("BRAND LICENSING PLATFORM", {
    x: MARGIN.left + 36,
    y: bandTop + 21,
    size: 7,
    font,
    color: COLORS.white,
  });
  const rlabel = "CERTIFICADO DE ASSINATURA";
  page.drawText(rlabel, {
    x: A4.w - MARGIN.right - bold.widthOfTextAtSize(rlabel, 8.5),
    y: bandTop + 28,
    size: 8.5,
    font: bold,
    color: COLORS.white,
  });

  let y = A4.h - MARGIN.top;
  const draw = (text: string, x: number, size: number, f: PDFFont, color: RGB) =>
    page.drawText(san(text), { x, y: y - size, size, font: f, color });

  const wrap = (text: string, size: number, maxW: number, f: PDFFont): string[] => {
    const out: string[] = [];
    for (const raw of san(text).split("\n")) {
      const words = raw.split(/\s+/).filter(Boolean);
      let cur = "";
      for (const w of words) {
        const t = cur ? cur + " " + w : w;
        if (f.widthOfTextAtSize(t, size) <= maxW || !cur) cur = t;
        else {
          out.push(cur);
          cur = w;
        }
      }
      if (cur) out.push(cur);
    }
    return out;
  };
  const para = (text: string, size = 9.5, f: PDFFont = font, color: RGB = COLORS.ink, gap = 1.42) => {
    for (const ln of wrap(text, size, CONTENT_W, f)) {
      page.drawText(ln, { x: MARGIN.left, y: y - size, size, font: f, color });
      y -= size * gap;
    }
  };
  const heading = (text: string) => {
    y -= 14;
    page.drawText(san(text), { x: MARGIN.left, y: y - 10, size: 10, font: bold, color: COLORS.brand });
    y -= 15;
    page.drawLine({
      start: { x: MARGIN.left, y },
      end: { x: A4.w - MARGIN.right, y },
      thickness: 0.8,
      color: COLORS.line,
    });
    y -= 9;
  };
  const kv = (pairs: { label: string; value: string }[]) => {
    const colW = CONTENT_W / 2;
    for (let i = 0; i < pairs.length; i += 2) {
      const rowTop = y;
      for (let c = 0; c < 2; c++) {
        const p = pairs[i + c];
        if (!p) continue;
        const x = MARGIN.left + c * colW;
        page.drawText(san(p.label).toUpperCase(), { x, y: rowTop - 9, size: 7, font: bold, color: COLORS.faint });
        page.drawText(san(p.value), { x, y: rowTop - 22, size: 9.5, font, color: COLORS.ink });
      }
      y -= 30;
    }
  };

  draw("CERTIFICADO DE ASSINATURA ELETRÔNICA", MARGIN.left, 16, bold, COLORS.navy);
  y -= 22;
  para(
    "Este certificado atesta que o documento identificado abaixo foi assinado eletronicamente na plataforma ALIANZA, com registro de autoria, data/hora e integridade por resumo criptográfico (SHA-256).",
    9,
    font,
    COLORS.muted,
  );

  heading("Documento");
  kv([
    { label: "Título", value: sig.title },
    { label: "Número", value: sig.number },
    { label: "Licenciado", value: sig.licenseeName },
    { label: "Código de verificação", value: sig.verificationCode },
  ]);

  heading("Signatário");
  kv([
    { label: "Nome", value: sig.signerName },
    { label: "CPF", value: sig.signerCpf },
    { label: "E-mail", value: sig.signerEmail || "-" },
    { label: "Data/hora da assinatura", value: fmtDateTimeBR(sig.signedAt) },
    { label: "Endereço IP", value: sig.signerIp || "-" },
  ]);
  if (sig.signerUserAgent) {
    page.drawText("DISPOSITIVO", { x: MARGIN.left, y: y - 9, size: 7, font: bold, color: COLORS.faint });
    y -= 12;
    para(sig.signerUserAgent, 8, font, COLORS.muted);
  }

  heading("Integridade e verificação");
  page.drawText("HASH SHA-256 DO DOCUMENTO", { x: MARGIN.left, y: y - 9, size: 7, font: bold, color: COLORS.faint });
  y -= 20;
  // Hash em duas metades para caber na largura
  const half = Math.ceil(sig.sourceSha256.length / 2);
  para(sig.sourceSha256.slice(0, half), 9, bold, COLORS.ink, 1.5);
  para(sig.sourceSha256.slice(half), 9, bold, COLORS.ink, 1.6);
  para(
    `Verifique a autenticidade em /verificar informando o código ${sig.verificationCode}. Qualquer alteração no conteúdo do documento invalida o resumo criptográfico acima.`,
    8.5,
    font,
    COLORS.muted,
  );

  // Selo/box de validade
  y -= 10;
  const boxH = 40;
  page.drawRectangle({
    x: MARGIN.left,
    y: y - boxH,
    width: CONTENT_W,
    height: boxH,
    color: COLORS.soft,
    borderColor: COLORS.brand,
    borderWidth: 0.8,
  });
  page.drawText("ASSINADO ELETRONICAMENTE", {
    x: MARGIN.left + 12,
    y: y - 17,
    size: 10,
    font: bold,
    color: COLORS.brand,
  });
  page.drawText(
    san("Documento com validade jurídica nos termos da MP 2.200-2/2001 e da Lei 14.063/2020."),
    { x: MARGIN.left + 12, y: y - 31, size: 8, font, color: COLORS.muted },
  );

  // Rodapé
  const fy = MARGIN.bottom - 26;
  page.drawLine({
    start: { x: MARGIN.left, y: fy + 14 },
    end: { x: A4.w - MARGIN.right, y: fy + 14 },
    thickness: 0.6,
    color: COLORS.line,
  });
  page.drawText("Certificado gerado pela Plataforma ALIANZA", {
    x: MARGIN.left,
    y: fy,
    size: 7,
    font,
    color: COLORS.faint,
  });
  const code = san(`Autenticidade: /verificar - codigo ${sig.verificationCode}`);
  page.drawText(code, {
    x: A4.w - MARGIN.right - font.widthOfTextAtSize(code, 7),
    y: fy,
    size: 7,
    font,
    color: COLORS.faint,
  });

  return pdf.save();
}
