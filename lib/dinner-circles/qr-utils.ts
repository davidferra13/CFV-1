/**
 * QR Circle Join URL utilities.
 *
 * Actual QR image generation is deferred to a client-side library.
 * This module provides the URL that would be encoded in the QR code.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://chefflow.co'

/** Return the public join URL for a given circle join token. */
export function getJoinUrl(token: string): string {
  return `${BASE_URL}/join/${token}`
}

/** Return the full join URL with optional UTM source for attribution. */
export function getJoinUrlWithAttribution(token: string, source?: string): string {
  const base = getJoinUrl(token)
  if (!source) return base
  return `${base}?src=${encodeURIComponent(source)}`
}
