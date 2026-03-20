// next-intl request configuration
// Cookie-based locale detection (no URL prefix needed)
// NOTE: next-intl is not yet installed - this file is a stub for future i18n support

// @ts-expect-error next-intl not yet installed
import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'

export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'pt', 'de', 'it', 'ja'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en'

const LOCALE_COOKIE = 'chefflow-locale'

/**
 * Resolve locale from (in priority order):
 * 1. chefflow-locale cookie (set by user preference)
 * 2. Accept-Language header
 * 3. Default 'en'
 */
async function resolveLocale(): Promise<SupportedLocale> {
  // 1. Cookie
  const cookieStore = await cookies()
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as SupportedLocale)) {
    return cookieLocale as SupportedLocale
  }

  // 2. Accept-Language header (take first supported match)
  const headerStore = await headers()
  const acceptLang = headerStore.get('accept-language')
  if (acceptLang) {
    const preferred = acceptLang
      .split(',')
      .map((part) => part.split(';')[0].trim().split('-')[0].toLowerCase())

    for (const lang of preferred) {
      if (SUPPORTED_LOCALES.includes(lang as SupportedLocale)) {
        return lang as SupportedLocale
      }
    }
  }

  // 3. Default
  return DEFAULT_LOCALE
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale()

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
