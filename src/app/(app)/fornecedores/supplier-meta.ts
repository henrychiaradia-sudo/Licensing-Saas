import type { SupplierStatus, SupplierType } from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

/** 14 tipos de fornecedor. */
export const SUPPLIER_TYPE_OPTIONS: { value: SupplierType; label: string }[] = [
  { value: "fabricante", label: "Fabricante" },
  { value: "distribuidor", label: "Distribuidor" },
  { value: "importador", label: "Importador" },
  { value: "prestador_servico", label: "Prestador de serviço" },
  { value: "agencia", label: "Agência" },
  { value: "transportadora", label: "Transportadora" },
  { value: "materia_prima", label: "Fornecedor de matéria-prima" },
  { value: "embalagem", label: "Fornecedor de embalagem" },
  { value: "grafico", label: "Fornecedor gráfico" },
  { value: "textil", label: "Fornecedor têxtil" },
  { value: "tecnologia", label: "Fornecedor de tecnologia" },
  { value: "consultoria", label: "Consultoria" },
  { value: "laboratorio", label: "Laboratório" },
  { value: "operador_logistico", label: "Operador logístico" },
];

export const TYPE_LABEL: Record<SupplierType, string> = SUPPLIER_TYPE_OPTIONS.reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label }),
  {} as Record<SupplierType, string>,
);

/** 9 status do ciclo de vida do fornecedor (+ legado "ativo"). */
export const SUPPLIER_STATUS_OPTIONS: { value: SupplierStatus; label: string }[] = [
  { value: "prospect", label: "Prospect" },
  { value: "em_avaliacao", label: "Em avaliação" },
  { value: "em_homologacao", label: "Em homologação" },
  { value: "homologado", label: "Homologado" },
  { value: "condicional", label: "Condicional" },
  { value: "suspenso", label: "Suspenso" },
  { value: "bloqueado", label: "Bloqueado" },
  { value: "inativo", label: "Inativo" },
  { value: "descontinuado", label: "Descontinuado" },
];

export const STATUS_LABEL: Record<SupplierStatus, string> = {
  prospect: "Prospect",
  em_avaliacao: "Em avaliação",
  em_homologacao: "Em homologação",
  homologado: "Homologado",
  condicional: "Condicional",
  suspenso: "Suspenso",
  bloqueado: "Bloqueado",
  inativo: "Inativo",
  descontinuado: "Descontinuado",
  ativo: "Ativo",
};

export const STATUS_TONE: Record<SupplierStatus, Tone> = {
  prospect: "info",
  em_avaliacao: "info",
  em_homologacao: "warn",
  homologado: "good",
  condicional: "warn",
  suspenso: "warn",
  bloqueado: "danger",
  inativo: "neutral",
  descontinuado: "neutral",
  ativo: "good",
};

/** Status de certificação/documento (validade). */
export function validityTone(validUntil: string | null | undefined): {
  label: string;
  tone: Tone;
} {
  if (!validUntil) return { label: "Sem validade", tone: "neutral" };
  const d = new Date(validUntil.length === 10 ? validUntil + "T00:00:00" : validUntil);
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (Number.isNaN(days)) return { label: "—", tone: "neutral" };
  if (days < 0) return { label: `Vencido há ${-days} d`, tone: "danger" };
  if (days <= 30) return { label: `Vence em ${days} d`, tone: "warn" };
  return { label: `Válido (${days} d)`, tone: "good" };
}
