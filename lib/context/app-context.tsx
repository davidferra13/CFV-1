'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

export type AppContextValue = {
  /** IANA timezone (e.g. "America/New_York"). Chef portal uses DB value; public pages use browser */
  timezone: string
  /** BCP 47 locale tag (e.g. "en-US"). Drives all Intl formatting */
  locale: string
  /** ISO 4217 currency code (e.g. "USD") */
  currency: string
}

const AppContext = createContext<AppContextValue>({
  timezone: 'America/New_York',
  locale: 'en-US',
  currency: 'USD',
})

/**
 * Provides time, locale, and currency context to all child components.
 *
 * In the chef portal: timezone comes from the chef's DB profile.
 * On public pages: timezone is detected from the browser via Intl.
 */
export function AppContextProvider({
  timezone,
  locale = 'en-US',
  currency = 'USD',
  children,
}: {
  timezone?: string
  locale?: string
  currency?: string
  children: ReactNode
}) {
  const value = useMemo<AppContextValue>(
    () => ({
      timezone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
      locale,
      currency,
    }),
    [timezone, locale, currency]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/** Access the global app context (timezone, locale, currency) */
export function useAppContext(): AppContextValue {
  return useContext(AppContext)
}
