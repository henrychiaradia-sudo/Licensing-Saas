import type {
  SupplierDocType,
  SupplierDocStatus,
  HomologationStatus,
  HomologationItemResult,
} from "@/lib/db/schema";

type Tone = "good" | "info" | "neutral" | "warn" | "danger";

/** 15 tipos de documento de fornecedor (item 23 do Prompt Mestre). */
export const DOC_TYPE_OPTIONS: { value: SupplierDocType; label: string }[] = [
  { value: "contrato_social", label: "Contrato social" },
  { value: "cnpj", label: "CNPJ" },
  { value: "certidao", label: "Certidões" },
  { value: "licenca", label: "Licenças" },
  { value: "certificacao", label: "Certificações" },
  { value: "seguro", label: "Seguros" },
  { value: "dados_bancarios", label: "Dados bancários" },
  { value: "codigo_conduta", label: "Código de conduta" },
  { value: "anticorrupcao", label: "Anticorrupção" },
  { value: "lgpd", label: "LGPD" },
  { value: "esg", label: "ESG" },
  { value: "qualidade", label: "Qualidade" },
  { value: "saude_seguranca", label: "Saúde e segurança" },
  { value: "direitos_trabalhistas", label: "Direitos trabalhistas" },
  { value: "auditoria", label: "Auditorias" },
];

export const DOC_TYPE_LABEL: Record<SupplierDocType, string> = DOC_TYPE_OPTIONS.reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label }),
  {} as Record<SupplierDocType, string>,
);

export const DOC_STATUS_OPTIONS: { value: SupplierDocStatus; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "em_analise", label: "Em análise" },
  { value: "aprovado", label: "Aprovado" },
  { value: "reprovado", label: "Reprovado" },
  { value: "vencido", label: "Vencido" },
];

export const DOC_STATUS_LABEL: Record<SupplierDocStatus, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
  vencido: "Vencido",
};

export const DOC_STATUS_TONE: Record<SupplierDocStatus, Tone> = {
  pendente: "neutral",
  em_analise: "info",
  aprovado: "good",
  reprovado: "danger",
  vencido: "warn",
};

/** Status do processo de homologação. */
export const HOMOLOG_STATUS_LABEL: Record<HomologationStatus, string> = {
  nao_iniciada: "Não iniciada",
  em_andamento: "Em andamento",
  aprovada: "Aprovada",
  condicional: "Condicional",
  reprovada: "Reprovada",
};

export const HOMOLOG_STATUS_TONE: Record<HomologationStatus, Tone> = {
  nao_iniciada: "neutral",
  em_andamento: "info",
  aprovada: "good",
  condicional: "warn",
  reprovada: "danger",
};

/** Resultado de cada item do checklist. */
export const ITEM_RESULT_OPTIONS: { value: HomologationItemResult; label: string }[] = [
  { value: "pendente", label: "Pendente" },
  { value: "conforme", label: "Conforme" },
  { value: "nao_conforme", label: "Não conforme" },
  { value: "na", label: "N/A" },
];

export const ITEM_RESULT_LABEL: Record<HomologationItemResult, string> = {
  pendente: "Pendente",
  conforme: "Conforme",
  nao_conforme: "Não conforme",
  na: "N/A",
};

export const ITEM_RESULT_TONE: Record<HomologationItemResult, Tone> = {
  pendente: "neutral",
  conforme: "good",
  nao_conforme: "danger",
  na: "info",
};
