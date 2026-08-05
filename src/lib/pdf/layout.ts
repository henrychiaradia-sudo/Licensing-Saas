import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";

/* ============================================================================
 * Motor de layout de PDF branded (ALIANZA) sobre pdf-lib.
 * Sem dependência nativa; StandardFonts (WinAnsi) cobrem acentos pt-BR.
 * Coordenadas do pdf-lib têm origem no canto inferior-esquerdo; internamente
 * o cursor `y` marca o TOPO do próximo elemento e desce conforme desenhamos.
 * ==========================================================================*/

export const A4 = { w: 595.28, h: 841.89 };
export const MARGIN = { left: 56, right: 56, top: 92, bottom: 64 };
export const CONTENT_W = A4.w - MARGIN.left - MARGIN.right;

export const COLORS = {
  brand: rgb(0.145, 0.388, 0.922), // #2563eb
  navy: rgb(0.031, 0.071, 0.129), // #081221
  ink: rgb(0.118, 0.161, 0.231), // #1e293b
  muted: rgb(0.44, 0.49, 0.55),
  faint: rgb(0.62, 0.66, 0.71),
  line: rgb(0.85, 0.87, 0.9),
  zebra: rgb(0.965, 0.973, 0.98),
  soft: rgb(0.94, 0.96, 0.99),
  white: rgb(1, 1, 1),
  good: rgb(0.06, 0.72, 0.51),
  warn: rgb(0.85, 0.5, 0.05),
  danger: rgb(0.86, 0.15, 0.15),
};

/** Normaliza texto para o encoding WinAnsi (evita erros com símbolos fora do Latin-1). */
export function san(s: string | null | undefined): string {
  return (s ?? "")
    .replace(/[\u00A0]/g, " ")
    .replace(/\t/g, " ")
    .replace(/\r/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2264]/g, "<=")
    .replace(/[\u2265]/g, ">=")
    .replace(/[\u2192]/g, "->")
    .replace(/[\u2713\u2714]/g, "OK")
    .replace(/[\u2022]/g, "-")
    .replace(/[^\n\u0020-\u00FF]/g, "");
}

export function fmtDateBR(d: string | Date | null | undefined): string {
  if (!d) return "—".replace("—", "-");
  const date = typeof d === "string" ? new Date(d.length === 10 ? d + "T00:00:00" : d) : d;
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function fmtDateTimeBR(d: Date): string {
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtMoneyBR(v: string | number | null | undefined, iso = "BRL"): string {
  if (v === null || v === undefined || v === "") return "-";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "-";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: iso }).format(n);
  } catch {
    return `${iso} ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export function fmtNum(v: string | number | null | undefined, digits = 0): string {
  if (v === null || v === undefined || v === "") return "-";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return "-";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export type Align = "left" | "right" | "center";
export type TableColumn = { header: string; width: number; align?: Align };

type FooterInfo = { verificationCode?: string };

/** Construtor de documento com faixa de marca, quebra de página e helpers. */
export class Doc {
  pdf!: PDFDocument;
  page!: PDFPage;
  font!: PDFFont; // Helvetica
  bold!: PDFFont; // Helvetica-Bold
  y = 0;
  private pages: PDFPage[] = [];
  private headerLabel: string;
  private footer: FooterInfo;

  private constructor(headerLabel: string, footer: FooterInfo) {
    this.headerLabel = headerLabel;
    this.footer = footer;
  }

  static async create(headerLabel: string, footer: FooterInfo = {}): Promise<Doc> {
    const d = new Doc(headerLabel, footer);
    d.pdf = await PDFDocument.create();
    d.pdf.setProducer("ALIANZA Brand Licensing Platform");
    d.pdf.setCreator("ALIANZA");
    d.font = await d.pdf.embedFont(StandardFonts.Helvetica);
    d.bold = await d.pdf.embedFont(StandardFonts.HelveticaBold);
    d.newPage();
    return d;
  }

  private newPage() {
    this.page = this.pdf.addPage([A4.w, A4.h]);
    this.pages.push(this.page);
    this.drawHeaderBand();
    this.y = A4.h - MARGIN.top;
  }

  /** Faixa azul da marca no topo de cada página + rótulo do documento à direita. */
  private drawHeaderBand() {
    const h = 64;
    const top = A4.h - h;
    this.page.drawRectangle({ x: 0, y: top, width: A4.w, height: h, color: COLORS.brand });
    // Tile branco com "A"
    this.page.drawRectangle({
      x: MARGIN.left,
      y: top + 20,
      width: 26,
      height: 26,
      color: COLORS.white,
      // cantos arredondados não são triviais em pdf-lib; retângulo sólido lê bem
    });
    this.page.drawText("A", {
      x: MARGIN.left + 7.5,
      y: top + 27,
      size: 16,
      font: this.bold,
      color: COLORS.brand,
    });
    this.page.drawText("ALIANZA", {
      x: MARGIN.left + 36,
      y: top + 34,
      size: 15,
      font: this.bold,
      color: COLORS.white,
    });
    this.page.drawText("BRAND LICENSING PLATFORM", {
      x: MARGIN.left + 36,
      y: top + 21,
      size: 7,
      font: this.font,
      color: COLORS.white,
    });
    const label = san(this.headerLabel).toUpperCase();
    const lw = this.bold.widthOfTextAtSize(label, 8.5);
    this.page.drawText(label, {
      x: A4.w - MARGIN.right - lw,
      y: top + 28,
      size: 8.5,
      font: this.bold,
      color: COLORS.white,
    });
  }

  /** Garante espaço vertical; se não couber, cria nova página. */
  ensure(space: number) {
    if (this.y - space < MARGIN.bottom) this.newPage();
  }

  space(n: number) {
    this.y -= n;
  }

  widthOf(text: string, size: number, bold = false): number {
    return (bold ? this.bold : this.font).widthOfTextAtSize(san(text), size);
  }

  private wrap(text: string, size: number, maxW: number, bold = false): string[] {
    const f = bold ? this.bold : this.font;
    const out: string[] = [];
    for (const rawLine of san(text).split("\n")) {
      const words = rawLine.split(/\s+/).filter(Boolean);
      if (words.length === 0) {
        out.push("");
        continue;
      }
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
  }

  /** Desenha uma linha simples (sem quebra) na posição x dada, respeitando alinhamento. */
  private drawLineAt(
    text: string,
    x: number,
    size: number,
    font: PDFFont,
    color: RGB,
    align: Align,
    boxW: number,
  ) {
    const t = san(text);
    let dx = x;
    if (align === "right") dx = x + boxW - font.widthOfTextAtSize(t, size);
    else if (align === "center") dx = x + (boxW - font.widthOfTextAtSize(t, size)) / 2;
    this.page.drawText(t, { x: dx, y: this.y - size, size, font, color });
  }

  /** Parágrafo com quebra automática. */
  paragraph(
    text: string,
    opts: { size?: number; bold?: boolean; color?: RGB; indent?: number; gapAfter?: number; lineGap?: number } = {},
  ) {
    const size = opts.size ?? 9.5;
    const font = opts.bold ? this.bold : this.font;
    const color = opts.color ?? COLORS.ink;
    const indent = opts.indent ?? 0;
    const lineGap = opts.lineGap ?? 1.42;
    const lines = this.wrap(text, size, CONTENT_W - indent, opts.bold);
    for (const ln of lines) {
      this.ensure(size * lineGap);
      this.page.drawText(ln, { x: MARGIN.left + indent, y: this.y - size, size, font, color });
      this.y -= size * lineGap;
    }
    if (opts.gapAfter) this.y -= opts.gapAfter;
  }

  /** Título de seção com filete inferior. */
  heading(text: string, opts: { size?: number; gapBefore?: number; gapAfter?: number } = {}) {
    const size = opts.size ?? 11.5;
    this.y -= opts.gapBefore ?? 14;
    this.ensure(size + 12);
    this.page.drawText(san(text), {
      x: MARGIN.left,
      y: this.y - size,
      size,
      font: this.bold,
      color: COLORS.brand,
    });
    this.y -= size + 5;
    this.page.drawLine({
      start: { x: MARGIN.left, y: this.y },
      end: { x: A4.w - MARGIN.right, y: this.y },
      thickness: 0.8,
      color: COLORS.line,
    });
    this.y -= opts.gapAfter ?? 9;
  }

  /** Bloco de pares rótulo/valor em N colunas. */
  fields(pairs: { label: string; value: string }[], cols = 2) {
    const colW = CONTENT_W / cols;
    const rowH = 30;
    for (let i = 0; i < pairs.length; i += cols) {
      this.ensure(rowH);
      const rowTop = this.y;
      for (let c = 0; c < cols; c++) {
        const p = pairs[i + c];
        if (!p) continue;
        const x = MARGIN.left + c * colW;
        this.page.drawText(san(p.label).toUpperCase(), {
          x,
          y: rowTop - 9,
          size: 7,
          font: this.bold,
          color: COLORS.faint,
        });
        const val = this.wrap(p.value || "-", 9.5, colW - 10)[0] ?? "-";
        this.page.drawText(val, { x, y: rowTop - 22, size: 9.5, font: this.font, color: COLORS.ink });
      }
      this.y -= rowH;
    }
  }

  /** Tabela com cabeçalho na cor da marca, zebra e quebra de página. */
  table(columns: TableColumn[], rows: string[][], opts: { fontSize?: number } = {}) {
    const size = opts.fontSize ?? 8.5;
    const padX = 6;
    const rowH = size + 9;
    const totalW = columns.reduce((s, c) => s + c.width, 0);
    const scale = CONTENT_W / totalW;
    const widths = columns.map((c) => c.width * scale);

    const drawHeader = () => {
      this.ensure(rowH);
      this.page.drawRectangle({
        x: MARGIN.left,
        y: this.y - rowH,
        width: CONTENT_W,
        height: rowH,
        color: COLORS.brand,
      });
      let x = MARGIN.left;
      columns.forEach((c, i) => {
        this.drawLineAtBox(c.header, x + padX, size, this.bold, COLORS.white, c.align ?? "left", widths[i] - padX * 2, this.y - rowH + 6);
        x += widths[i];
      });
      this.y -= rowH;
    };

    drawHeader();
    rows.forEach((r, ri) => {
      if (this.y - rowH < MARGIN.bottom) {
        this.newPage();
        drawHeader();
      }
      if (ri % 2 === 1) {
        this.page.drawRectangle({
          x: MARGIN.left,
          y: this.y - rowH,
          width: CONTENT_W,
          height: rowH,
          color: COLORS.zebra,
        });
      }
      let x = MARGIN.left;
      columns.forEach((c, i) => {
        const cell = this.clip(r[i] ?? "", size, widths[i] - padX * 2);
        this.drawLineAtBox(cell, x + padX, size, this.font, COLORS.ink, c.align ?? "left", widths[i] - padX * 2, this.y - rowH + 6);
        x += widths[i];
      });
      this.y -= rowH;
    });
    // filete inferior
    this.page.drawLine({
      start: { x: MARGIN.left, y: this.y },
      end: { x: A4.w - MARGIN.right, y: this.y },
      thickness: 0.6,
      color: COLORS.line,
    });
  }

  private clip(text: string, size: number, maxW: number): string {
    let t = san(text);
    if (this.font.widthOfTextAtSize(t, size) <= maxW) return t;
    while (t.length > 1 && this.font.widthOfTextAtSize(t + "…".replace("…", ".."), size) > maxW) {
      t = t.slice(0, -1);
    }
    return t + "..";
  }

  private drawLineAtBox(
    text: string,
    x: number,
    size: number,
    font: PDFFont,
    color: RGB,
    align: Align,
    boxW: number,
    baselineY: number,
  ) {
    const t = san(text);
    let dx = x;
    if (align === "right") dx = x + boxW - font.widthOfTextAtSize(t, size);
    else if (align === "center") dx = x + (boxW - font.widthOfTextAtSize(t, size)) / 2;
    this.page.drawText(t, { x: dx, y: baselineY, size, font, color });
  }

  /** Caixa de destaque (fundo suave) com título e valor grande. */
  statRow(items: { label: string; value: string; tone?: RGB }[]) {
    const gap = 10;
    const n = items.length;
    const boxW = (CONTENT_W - gap * (n - 1)) / n;
    const boxH = 46;
    this.ensure(boxH);
    const top = this.y;
    items.forEach((it, i) => {
      const x = MARGIN.left + i * (boxW + gap);
      this.page.drawRectangle({
        x,
        y: top - boxH,
        width: boxW,
        height: boxH,
        color: COLORS.soft,
        borderColor: COLORS.line,
        borderWidth: 0.6,
      });
      this.page.drawText(san(it.label).toUpperCase(), {
        x: x + 8,
        y: top - 15,
        size: 6.8,
        font: this.bold,
        color: COLORS.faint,
      });
      const vSize = 12.5;
      this.page.drawText(this.clip(it.value, vSize, boxW - 16), {
        x: x + 8,
        y: top - 34,
        size: vSize,
        font: this.bold,
        color: it.tone ?? COLORS.ink,
      });
    });
    this.y -= boxH;
  }

  /** Blocos de assinatura lado a lado (linha + nome + papel + nota). */
  signatureBlocks(blocks: { role: string; name: string; note?: string }[]) {
    const gap = 24;
    const n = blocks.length;
    const boxW = (CONTENT_W - gap * (n - 1)) / n;
    const boxH = 58;
    this.ensure(boxH);
    const top = this.y;
    blocks.forEach((b, i) => {
      const x = MARGIN.left + i * (boxW + gap);
      const lineY = top - 26;
      this.page.drawLine({
        start: { x, y: lineY },
        end: { x: x + boxW, y: lineY },
        thickness: 0.8,
        color: COLORS.ink,
      });
      this.page.drawText(this.clip(b.name, 9.5, boxW), {
        x,
        y: lineY - 13,
        size: 9.5,
        font: this.bold,
        color: COLORS.ink,
      });
      this.page.drawText(san(b.role), {
        x,
        y: lineY - 25,
        size: 7.5,
        font: this.bold,
        color: COLORS.brand,
      });
      if (b.note) {
        this.page.drawText(this.clip(b.note, 7, boxW), {
          x,
          y: lineY - 36,
          size: 7,
          font: this.font,
          color: COLORS.faint,
        });
      }
    });
    this.y -= boxH;
  }

  hr(gap = 8) {
    this.y -= gap;
    this.ensure(2);
    this.page.drawLine({
      start: { x: MARGIN.left, y: this.y },
      end: { x: A4.w - MARGIN.right, y: this.y },
      thickness: 0.6,
      color: COLORS.line,
    });
    this.y -= gap;
  }

  /** Rodapé com paginação e código de verificação — desenhado no fim (total conhecido). */
  private drawFooters() {
    const total = this.pages.length;
    this.pages.forEach((pg, idx) => {
      const y = MARGIN.bottom - 26;
      pg.drawLine({
        start: { x: MARGIN.left, y: y + 14 },
        end: { x: A4.w - MARGIN.right, y: y + 14 },
        thickness: 0.6,
        color: COLORS.line,
      });
      pg.drawText("Documento gerado pela Plataforma ALIANZA", {
        x: MARGIN.left,
        y,
        size: 7,
        font: this.font,
        color: COLORS.faint,
      });
      if (this.footer.verificationCode) {
        const mid = san(`Autenticidade: /verificar - codigo ${this.footer.verificationCode}`);
        const mw = this.font.widthOfTextAtSize(mid, 7);
        pg.drawText(mid, { x: (A4.w - mw) / 2, y, size: 7, font: this.font, color: COLORS.faint });
      }
      const pnum = `Pagina ${idx + 1} de ${total}`;
      const pw = this.font.widthOfTextAtSize(pnum, 7);
      pg.drawText(pnum, { x: A4.w - MARGIN.right - pw, y, size: 7, font: this.font, color: COLORS.faint });
    });
  }

  async finish(): Promise<Uint8Array> {
    this.drawFooters();
    return this.pdf.save();
  }
}

/** SHA-256 hex de um buffer de bytes. */
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(Buffer.from(bytes)).digest("hex");
}
