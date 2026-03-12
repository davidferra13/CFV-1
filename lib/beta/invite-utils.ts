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

export function buildBetaSignInUrl(
  redirectTo = '/onboarding',
  fallbackOrigin?: string | null
): string {
  return `${resolveBetaInviteBaseUrl(fallbackOrigin)}/auth/signin?redirect=${encodeURIComponent(redirectTo)}`
}

export function buildBetaOnboardingUrl(fallbackOrigin?: string | null): string {
  return `${resolveBetaInviteBaseUrl(fallbackOrigin)}/onboarding`
}

export function buildBetaDashboardUrl(fallbackOrigin?: string | null): string {
  return `${resolveBetaInviteBaseUrl(fallbackOrigin)}/dashboard`
}

export function buildBetaContactUrl(fallbackOrigin?: string | null): string {
  return `${resolveBetaInviteBaseUrl(fallbackOrigin)}/contact`
}
