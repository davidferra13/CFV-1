type AuthRequestOriginOptions = {
  requestOrigin?: string | null
  forwardedProto?: string | null
  forwardedHost?: string | null
  host?: string | null
}

function normalizeOrigin(candidate?: string | null): string | null {
  if (!candidate) return null

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null
    }
    return parsed.origin
  } catch {
    return null
  }
}

function normalizeHeaderValue(candidate?: string | null): string | null {
  const value = candidate?.split(',')[0]?.trim()
  return value ? value : null
}

export function resolveAuthRequestOrigin(options: AuthRequestOriginOptions = {}): string | null {
  const requestOrigin = normalizeOrigin(options.requestOrigin)
  const forwardedHost =
    normalizeHeaderValue(options.forwardedHost) ?? normalizeHeaderValue(options.host)

  if (!forwardedHost) {
    return requestOrigin
  }

  const forwardedProto =
    normalizeHeaderValue(options.forwardedProto) ??
    (requestOrigin?.startsWith('https://') ? 'https' : 'http')

  return normalizeOrigin(`${forwardedProto}://${forwardedHost}`) ?? requestOrigin
}

export function resolveAuthCookieOptions(options: AuthRequestOriginOptions = {}) {
  const origin = resolveAuthRequestOrigin(options)
  const useSecureCookies = origin?.startsWith('https://') ?? false

  return {
    origin,
    useSecureCookies,
    sessionCookieName: useSecureCookies ? '__Secure-authjs.session-token' : 'authjs.session-token',
  }
}
