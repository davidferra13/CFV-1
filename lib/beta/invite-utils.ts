const FALLBACK_APP_URL = 'https://cheflowhq.com'

export function resolveBetaInviteBaseUrl(fallbackOrigin?: string | null): string {
  const rawBaseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    fallbackOrigin ||
    FALLBACK_APP_URL

  return rawBaseUrl.replace(/\/+$/, '')
}

export function buildBetaInviteUrl(email: string, fallbackOrigin?: string | null): string {
  const normalizedEmail = email.trim().toLowerCase()
  return `${resolveBetaInviteBaseUrl(fallbackOrigin)}/auth/signup?ref=beta&email=${encodeURIComponent(normalizedEmail)}`
}
