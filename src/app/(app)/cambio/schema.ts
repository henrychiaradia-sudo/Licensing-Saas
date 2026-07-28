import { z } from "zod";

export const HEDGE_INSTRUMENT = ["ndf", "forward", "swap", "opcao"] as const;
export const HEDGE_SIDE = ["compra", "venda"] as const;
export const HEDGE_STATUS = ["ativo", "liquidado", "cancelado"] as const;

export const fxRateSchema = z.object({
  currencyId: z.string().uuid("Selecione a moeda."),
  rateToBase: z.number().positive("Informe a taxa (BRL por unidade).").max(1_000_000),
  rateDate: z.string().min(1, "Informe a data."),
  source: z.string().trim().max(80).nullable(),
});

export const hedgeSchema = z.object({
  currencyId: z.string().uuid("Selecione a moeda."),
  instrument: z.enum(HEDGE_INSTRUMENT),
  side: z.enum(HEDGE_SIDE),
  notional: z.number().positive("Informe o notional (moeda estrangeira).").max(10_000_000_000),
  strikeRate: z.number().positive("Informe a taxa contratada.").max(1_000_000),
  tradeDate: z.string().min(1, "Informe a data da operação."),
  maturityDate: z.string().min(1, "Informe o vencimento."),
  counterparty: z.string().trim().max(120).nullable(),
  notes: z.string().trim().max(500).nullable(),
});

export const hedgeStatusSchema = z.object({
  status: z.enum(HEDGE_STATUS),
});
