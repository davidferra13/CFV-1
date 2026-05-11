import 'server-only'

import { cookies } from 'next/headers'
import type { AccountLocation } from './account-location'

const COOKIE_NAME = 'cf_default_zip'
const ONE_YEAR = 60 * 60 * 24 * 365

/** Read the public location cookie. Returns null if absent or unparseable. */
export async function getPublicLocationCookie(): Promise<AccountLocation | null> {
  try {
    const store = await cookies()
    const raw = store.get(COOKIE_NAME)?.value
    if (!raw) return null
    return JSON.parse(raw) as AccountLocation
  } catch {
    return null
  }
}

/** Persist an AccountLocation to a cookie for public (pre-auth) pages. */
export async function setPublicLocationCookie(location: AccountLocation): Promise<void> {
  try {
    const store = await cookies()
    store.set(COOKIE_NAME, JSON.stringify(location), {
      httpOnly: true,
      sameSite: 'lax' as const,
      maxAge: ONE_YEAR,
      path: '/',
    })
  } catch {
    // cookies() throws outside of a request context; silently skip
  }
}
