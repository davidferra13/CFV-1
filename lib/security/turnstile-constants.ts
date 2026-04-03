export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA'
export const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA'

export function normalizeTurnstileHostname(host?: string | null): string {
  if (!host) return ''

  let normalized = host.trim().toLowerCase()
  if (!normalized) return ''

  if (normalized.startsWith('[')) {
    const end = normalized.indexOf(']')
    return end >= 0 ? normalized.slice(1, end) : normalized
  }

  const colonIndex = normalized.indexOf(':')
  if (colonIndex >= 0 && normalized.indexOf(':', colonIndex + 1) === -1) {
    normalized = normalized.slice(0, colonIndex)
  }

  return normalized
}

export function isLocalTurnstileHost(host?: string | null): boolean {
  const normalized = normalizeTurnstileHostname(host)
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1'
}
