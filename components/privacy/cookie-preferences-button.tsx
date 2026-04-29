'use client'

import { useEffect, useState } from 'react'
import {
  COOKIE_CONSENT_EVENT,
  openCookieConsentManager,
  readCookieConsent,
  type CookieConsentState,
} from '@/lib/privacy/cookie-consent-client'

function getStatusText(consent: CookieConsentState) {
  if (consent === 'accepted') return 'Analytics cookies are accepted.'
  if (consent === 'declined') return 'Analytics cookies are declined.'
  return 'Analytics cookie preference has not been set.'
}

export function CookiePreferencesButton() {
  const [consent, setConsent] = useState<CookieConsentState>('unknown')

  useEffect(() => {
    setConsent(readCookieConsent())

    function handleConsentChanged() {
      setConsent(readCookieConsent())
    }

    window.addEventListener(COOKIE_CONSENT_EVENT, handleConsentChanged)
    return () => {
      window.removeEventListener(COOKIE_CONSENT_EVENT, handleConsentChanged)
    }
  }, [])

  return (
    <div className="mt-4 border-l border-stone-700 pl-4">
      <p className="mb-3 text-sm text-stone-400">{getStatusText(consent)}</p>
      <button
        type="button"
        onClick={openCookieConsentManager}
        className="rounded-lg border border-stone-700 px-4 py-2 text-sm font-medium text-stone-200 transition-colors hover:border-brand-500 hover:text-brand-300"
      >
        Manage cookie preferences
      </button>
    </div>
  )
}
