// Currency & locale resolution for multi-currency support
// Resolves a chef's preferred currency and locale from the database
// Uses unstable_cache for performance (busted on settings update)

import { unstable_cache } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { SUPPORTED_CURRENCIES } from '@/lib/currency/frankfurter'

export type ChefCurrencyConfig = {
  currency: string
  locale: string
}

const DEFAULT_CURRENCY = 'USD'
const DEFAULT_LOCALE = 'en-US'

/**
 * Get a chef's preferred currency code (e.g. 'USD', 'EUR', 'GBP').
 * Falls back to 'USD' if not set or chef not found.
 * Cached per request cycle with tag-based invalidation.
 */
export async function getChefCurrency(tenantId: string): Promise<string> {
  const config = await getChefCurrencyConfig(tenantId)
  return config.currency
}

/**
 * Get a chef's preferred locale (e.g. 'en-US', 'es-MX', 'fr-FR').
 * Falls back to 'en-US' if not set or chef not found.
 */
export async function getChefLocale(tenantId: string): Promise<string> {
  const config = await getChefCurrencyConfig(tenantId)
  return config.locale
}

/**
 * Get both currency and locale for a chef in one call.
 * Cached with unstable_cache, busted by revalidateTag('chef-currency-{tenantId}').
 */
export const getChefCurrencyConfig = unstable_cache(
  async (tenantId: string): Promise<ChefCurrencyConfig> => {
    const supabase = createServerClient({ admin: true })

    const { data } = await supabase
      .from('chefs')
      .select('preferred_currency, preferred_locale')
      .eq('id', tenantId)
      .single()

    const currency = data?.preferred_currency ?? DEFAULT_CURRENCY
    const locale = data?.preferred_locale ?? DEFAULT_LOCALE

    // Validate currency is one we support
    const isValid = SUPPORTED_CURRENCIES.some((c) => c.code === currency)

    return {
      currency: isValid ? currency : DEFAULT_CURRENCY,
      locale: locale || DEFAULT_LOCALE,
    }
  },
  ['chef-currency-config'],
  {
    tags: ['chef-currency'],
    revalidate: 300, // 5 min fallback
  }
)

/**
 * Validate that a currency code is supported.
 */
export function isSupportedCurrency(code: string): boolean {
  return SUPPORTED_CURRENCIES.some((c) => c.code === code)
}

/**
 * Map locale to Stripe-compatible currency code (lowercase).
 */
export function toStripeCurrency(code: string): string {
  return code.toLowerCase()
}
