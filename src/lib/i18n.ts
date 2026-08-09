/**
 * i18n leve, sem dependência. Dicionário pt-BR (padrão) + en, com fallback
 * automático para pt-BR quando faltar a chave — assim telas ainda não traduzidas
 * nunca ficam "quebradas". Este módulo é puro (cliente e servidor).
 */

export const LOCALES = ["pt-BR", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "pt-BR";
export const LOCALE_COOKIE = "locale";

export const LOCALE_LABEL: Record<Locale, string> = {
  "pt-BR": "Português",
  en: "English",
};

type Dict = Record<string, string>;

const pt: Dict = {
  "lang.label": "Idioma",
  "header.search": "Buscar contratos, produtos, fornecedores…",
  "header.notifications": "Notificações",
  "header.logout": "Sair",
  "header.account": "Segurança da conta",

  "login.back": "Voltar ao site",
  "login.title": "Entrar na plataforma",
  "login.subtitle": "Acesse com suas credenciais corporativas.",
  "login.email": "E-mail",
  "login.password": "Senha",
  "login.mfa": "Código 2FA",
  "login.mfaHint": "(apenas se você ativou o 2FA)",
  "login.submit": "Entrar",
  "login.noAccount": "Ainda não tem conta?",
  "login.createAccount": "Criar conta grátis",
  "login.invalid": "Credenciais inválidas.",
  "login.help": "Precisa de ajuda? Fale no WhatsApp",
  "login.demo": "Acessos de demonstração",
  "login.internal": "Interno",
  "login.portalLicensee": "Portal licenciado",
  "login.portalSupplier": "Portal fornecedor",
  "login.terms1": "Ao entrar, você concorda com os",
  "login.terms": "Termos de Uso",
  "login.and": "e a",
  "login.privacy": "Política de Privacidade",
  "login.heroTitle": "Sua operação de licenciamento, ponta a ponta.",
  "login.heroSubtitle":
    "Contratos, royalties, produtos, suprimentos, qualidade e BI — com portais externos, 2FA e trilha de auditoria.",
  "login.hero1": "Motor de royalties configurável com faturamento",
  "login.hero2": "Sourcing com equalização por pesos e TCO",
  "login.hero3": "Auditoria forense e perfis de acesso (RBAC)",
  "login.helpTitle": "Precisa de ajuda para entrar?",

  "verify.title": "Verificar autenticidade",
  "verify.subtitle":
    "Informe o código de verificação impresso no rodapé do documento (ex.: ALZ-XXXX-XXXX) para conferir sua autenticidade e integridade.",
  "verify.button": "Verificar",
  "verify.platform": "Plataforma de Licenciamento ALIANZA",
  "verify.notFound": "Código não encontrado",
  "verify.notFoundText":
    "Não localizamos nenhum documento com o código informado. Confira o código no rodapé do documento.",
  "verify.tryAnother": "Tentar outro código",
  "verify.authentic": "Documento autêntico e assinado",
  "verify.awaiting": "Documento emitido — aguardando assinatura",
  "verify.cancelled": "Documento cancelado",
  "verify.issued": "Documento emitido",
  "verify.code": "Código",
  "verify.fDocument": "Documento",
  "verify.fNumber": "Número",
  "verify.fType": "Tipo",
  "verify.fLicensee": "Licenciado",
  "verify.fIssued": "Emitido em",
  "verify.fStatus": "Situação",
  "verify.fSigner": "Signatário",
  "verify.fCpf": "CPF",
  "verify.fSignedAt": "Assinado em",
  "verify.hash": "Hash SHA-256 do documento",
  "verify.hashNote":
    "A integridade é garantida por resumo criptográfico. Qualquer alteração no conteúdo do documento produz um hash diferente do apresentado acima.",
};

const en: Dict = {
  "lang.label": "Language",
  "header.search": "Search contracts, products, suppliers…",
  "header.notifications": "Notifications",
  "header.logout": "Log out",
  "header.account": "Account security",

  "login.back": "Back to site",
  "login.title": "Sign in to the platform",
  "login.subtitle": "Access with your corporate credentials.",
  "login.email": "Email",
  "login.password": "Password",
  "login.mfa": "2FA code",
  "login.mfaHint": "(only if you enabled 2FA)",
  "login.submit": "Sign in",
  "login.noAccount": "Don't have an account yet?",
  "login.createAccount": "Create free account",
  "login.invalid": "Invalid credentials.",
  "login.help": "Need help? Chat on WhatsApp",
  "login.demo": "Demo access",
  "login.internal": "Internal",
  "login.portalLicensee": "Licensee portal",
  "login.portalSupplier": "Supplier portal",
  "login.terms1": "By signing in, you agree to the",
  "login.terms": "Terms of Use",
  "login.and": "and the",
  "login.privacy": "Privacy Policy",
  "login.heroTitle": "Your licensing operation, end to end.",
  "login.heroSubtitle":
    "Contracts, royalties, products, procurement, quality and BI — with external portals, 2FA and audit trail.",
  "login.hero1": "Configurable royalty engine with invoicing",
  "login.hero2": "Sourcing with weighted equalization and TCO",
  "login.hero3": "Forensic audit and access profiles (RBAC)",
  "login.helpTitle": "Need help signing in?",

  "verify.title": "Verify authenticity",
  "verify.subtitle":
    "Enter the verification code printed at the footer of the document (e.g. ALZ-XXXX-XXXX) to check its authenticity and integrity.",
  "verify.button": "Verify",
  "verify.platform": "ALIANZA Licensing Platform",
  "verify.notFound": "Code not found",
  "verify.notFoundText":
    "We couldn't find any document with the provided code. Please check the code at the footer of the document.",
  "verify.tryAnother": "Try another code",
  "verify.authentic": "Authentic and signed document",
  "verify.awaiting": "Document issued — awaiting signature",
  "verify.cancelled": "Cancelled document",
  "verify.issued": "Document issued",
  "verify.code": "Code",
  "verify.fDocument": "Document",
  "verify.fNumber": "Number",
  "verify.fType": "Type",
  "verify.fLicensee": "Licensee",
  "verify.fIssued": "Issued on",
  "verify.fStatus": "Status",
  "verify.fSigner": "Signer",
  "verify.fCpf": "Tax ID (CPF)",
  "verify.fSignedAt": "Signed on",
  "verify.hash": "Document SHA-256 hash",
  "verify.hashNote":
    "Integrity is guaranteed by a cryptographic digest. Any change to the document content produces a hash different from the one shown above.",
};

const DICTS: Record<Locale, Dict> = { "pt-BR": pt, en };

export function normalizeLocale(v: string | null | undefined): Locale {
  return v && (LOCALES as readonly string[]).includes(v) ? (v as Locale) : DEFAULT_LOCALE;
}

/** Traduz uma chave; cai para pt-BR e depois para a própria chave. */
export function t(locale: Locale, key: string): string {
  return DICTS[locale]?.[key] ?? DICTS[DEFAULT_LOCALE][key] ?? key;
}

/** Retorna um tradutor fixado num locale: `const tr = translator(locale); tr("login.title")`. */
export function translator(locale: Locale): (key: string) => string {
  return (key: string) => t(locale, key);
}
