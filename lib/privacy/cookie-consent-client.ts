export const COOKIE_CONSENT_COOKIE_NAME = 'cookieConsent'
export const COOKIE_CONSENT_EVENT = 'cf:cookie-consent'
export const COOKIE_CONSENT_MANAGE_EVENT = 'cf:manage-cookie-consent'

export type CookieConsentValue = 'accepted' | 'declined'
export type CookieConsentState = CookieConsentValue | 'unknown'

export function readCookieConsent(): CookieConsentState {
  if (typeof document === 'undefined') return 'unknown'
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_CONSENT_COOKIE_NAME}=([^;]+)`)
  )
  if (!match) return 'unknown'
  const value = decodeURIComponent(match[1])
  return value === 'accepted' || value === 'declined' ? value : 'unknown'
}

export function writeCookieConsent(value: CookieConsentValue, days = 365) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

export function dispatchCookieConsent(value: CookieConsentValue) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: value }))
}

export function saveCookieConsent(value: CookieConsentValue) {
  writeCookieConsent(value)
  dispatchCookieConsent(value)
}

export function openCookieConsentManager() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_MANAGE_EVENT))
}

export function hasAcceptedAnalyticsCookies() {
  return readCookieConsent() === 'accepted'
}
