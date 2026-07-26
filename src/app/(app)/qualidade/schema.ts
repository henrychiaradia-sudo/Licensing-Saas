import { z } from "zod";

export const INSPECTION_TYPE = ["recebimento", "producao", "auditoria", "outro"] as const;
export const QUALITY_RESULT = ["pendente", "aprovado", "aprovado_condicional", "reprovado"] as const;
export const NC_SEVERITY = ["baixa", "media", "alta", "critica"] as const;
export const NC_STATUS = ["aberta", "em_tratamento", "resolvida", "cancelada"] as const;

export const inspectionSchema = z.object({
  inspectionType: z.enum(INSPECTION_TYPE),
  title: z.string().trim().min(2, "Informe o título da inspeção.").max(200),
  supplierId: z.string().uuid().nullable(),
  sampleSize: z.number().int().min(0).max(10_000_000),
  defectsFound: z.number().int().min(0).max(10_000_000),
  result: z.enum(QUALITY_RESULT),
  inspectedAt: z.string().nullable(),
  notes: z.string().trim().max(2000).nullable(),
});

export const ncSchema = z.object({
  severity: z.enum(NC_SEVERITY),
  description: z.string().trim().min(2, "Descreva a não-conformidade.").max(2000),
  disposition: z.string().trim().max(1000).nullable(),
  correctiveAction: z.string().trim().max(1000).nullable(),
});
