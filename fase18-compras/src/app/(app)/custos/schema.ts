import { z } from "zod";

const money = z.number().min(0).max(1_000_000_000);
const pct = z.number().min(0).max(100000);

export const costSheetSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da ficha.").max(200),
  productId: z.string().uuid().nullable(),
  supplierId: z.string().uuid().nullable(),
  sku: z.string().trim().max(80).nullable(),
  currency: z.string().trim().min(1).max(8),
  fob: money,
  freightIntl: money,
  insurance: money,
  ii: money,
  ipiImport: money,
  icms: money,
  pis: money,
  cofins: money,
  iss: money,
  ipi: money,
  armazenagem: money,
  desembaraco: money,
  comissao: money,
  royalties: money,
  marketing: money,
  trade: money,
  logistica: money,
  custoIndustrial: money,
  markupPct: pct,
  notes: z.string().trim().max(2000).nullable(),
});
