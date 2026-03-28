export const GOOGLE_CONNECT_CALLBACK_PATH = '/api/auth/google/connect/callback'

export function sanitizeGoogleConnectReturnTo(returnTo?: string | null): string | null {
  if (!returnTo) return null
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return null

  try {
    const url = new URL(returnTo, 'https://cheflowhq.com')
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

export function buildGoogleConnectResultPath(options: {
  returnTo?: string | null
  key: 'connected' | 'error'
  value: string
  fallbackPath?: string
}): string {
  const basePath =
    sanitizeGoogleConnectReturnTo(options.returnTo) ?? options.fallbackPath ?? '/settings'
  const url = new URL(basePath, 'https://cheflowhq.com')
  url.searchParams.set(options.key, options.value)
  return `${url.pathname}${url.search}${url.hash}`
}
