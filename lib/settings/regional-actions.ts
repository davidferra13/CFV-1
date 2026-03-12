'use server'

// Regional settings: currency + language preferences
// Chef-only server actions for updating preferred_currency and preferred_locale

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidateTag } from 'next/cache'
import { isSupportedCurrency } from '@/lib/currency/resolve'
import { SUPPORTED_LOCALES } from '@/i18n/request'
import { cookies } from 'next/headers'

/**
 * Update the chef's preferred currency.
 * Also busts the chef-currency cache tag so all formatters pick up the change.
 */
export async function updatePreferredCurrency(currencyCode: string) {
  const user = await requireChef()

  if (!isSupportedCurrency(currencyCode)) {
    throw new Error(`Unsupported currency: ${currencyCode}`)
  }

  const supabase = createServerClient()

  const { error } = await supabase
    .from('chefs')
    .update({ preferred_currency: currencyCode })
    .eq('id', user.entityId)

  if (error) {
    console.error('[regional settings] Currency update failed:', error)
    throw new Error('Failed to update currency')
  }

  revalidateTag('chef-currency')
}

/**
 * Update the chef's preferred locale (language).
 * Also sets the chefflow-locale cookie for immediate client-side effect
 * and busts the chef-currency cache tag (which also caches locale).
 */
export async function updatePreferredLocale(locale: string) {
  const user = await requireChef()

  const shortLocale = locale.split('-')[0]
  if (!SUPPORTED_LOCALES.includes(shortLocale as any)) {
    throw new Error(`Unsupported locale: ${locale}`)
  }

  const supabase = createServerClient()

  const { error } = await supabase
    .from('chefs')
    .update({ preferred_locale: locale })
    .eq('id', user.entityId)

  if (error) {
    console.error('[regional settings] Locale update failed:', error)
    throw new Error('Failed to update language')
  }

  // Set cookie for immediate effect on next request
  const cookieStore = await cookies()
  cookieStore.set('chefflow-locale', shortLocale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })

  revalidateTag('chef-currency')
}

/**
 * Get the chef's current regional settings.
 */
export async function getRegionalSettings() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('chefs')
    .select('preferred_currency, preferred_locale')
    .eq('id', user.entityId)
    .single()

  return {
    currency: data?.preferred_currency ?? 'USD',
    locale: data?.preferred_locale ?? 'en-US',
  }
}
