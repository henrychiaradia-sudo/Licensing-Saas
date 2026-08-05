import "server-only";
import { cookies } from "next/headers";
import { normalizeLocale, translator, type Locale, LOCALE_COOKIE } from "./i18n";

/** Locale atual a partir do cookie (padrão pt-BR). Uso em Server Components. */
export async function getLocale(): Promise<Locale> {
  const c = await cookies();
  return normalizeLocale(c.get(LOCALE_COOKIE)?.value);
}

/** Atalho: retorna { locale, t } já resolvidos para o Server Component. */
export async function getI18n(): Promise<{ locale: Locale; t: (key: string) => string }> {
  const locale = await getLocale();
  return { locale, t: translator(locale) };
}
