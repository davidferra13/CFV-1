import { GOOGLE_CONNECT_CALLBACK_PATH, sanitizeGoogleConnectReturnTo } from './connect-shared'

export const GOOGLE_OAUTH_CSRF_COOKIE = 'google-oauth-csrf'

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const LOCAL_DEV_ORIGIN = 'http://localhost:3100'
const UNSAFE_PRODUCTION_HOSTS = new Set(['localhost', '0.0.0.0', '::1', '[::1]'])
const UNSAFE_PRODUCTION_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
]

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

function isUnsafeProductionOrigin(candidate?: string | null): boolean {
  const origin = normalizeOrigin(candidate)
  if (!origin) return true

  const hostname = new URL(origin).hostname.toLowerCase()
  if (UNSAFE_PRODUCTION_HOSTS.has(hostname)) return true
  return UNSAFE_PRODUCTION_IP_RANGES.some((pattern) => pattern.test(hostname))
}

function normalizeHeaderValue(candidate?: string | null): string | null {
  const value = candidate?.split(',')[0]?.trim()
  return value ? value : null
}

export function resolveGoogleConnectRequestOrigin(options?: {
  requestOrigin?: string | null
  forwardedProto?: string | null
  forwardedHost?: string | null
  host?: string | null
}): string | null {
  const requestOrigin = normalizeOrigin(options?.requestOrigin)
  const forwardedHost =
    normalizeHeaderValue(options?.forwardedHost) ?? normalizeHeaderValue(options?.host)

  if (!forwardedHost) {
    return requestOrigin
  }

  const forwardedProto =
    normalizeHeaderValue(options?.forwardedProto) ??
    (requestOrigin?.startsWith('https://') ? 'https' : 'http')

  return normalizeOrigin(`${forwardedProto}://${forwardedHost}`) ?? requestOrigin
}

export function resolveGoogleConnectOrigin(options?: {
  siteUrl?: string | null
  appUrl?: string | null
  requestOrigin?: string | null
  nodeEnv?: string
}): string {
  const requestOrigin = normalizeOrigin(options?.requestOrigin)
  const siteOrigin = normalizeOrigin(options?.siteUrl)
  const appOrigin = normalizeOrigin(options?.appUrl)
  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV

  if (nodeEnv !== 'production') {
    return requestOrigin ?? siteOrigin ?? appOrigin ?? LOCAL_DEV_ORIGIN
  }

  const productionCandidates = [siteOrigin, appOrigin, requestOrigin]
  for (const candidate of productionCandidates) {
    if (candidate && !isUnsafeProductionOrigin(candidate)) {
      return candidate
    }
  }

  return siteOrigin ?? appOrigin ?? requestOrigin ?? LOCAL_DEV_ORIGIN
}

export function buildGoogleConnectCallbackUrl(options: { callbackOrigin: string }): string {
  return `${options.callbackOrigin}${GOOGLE_CONNECT_CALLBACK_PATH}`
}

export function buildGoogleConnectAuthorizeUrl(options: {
  callbackOrigin: string
  chefId: string
  clientId: string
  csrfToken: string
  returnTo?: string | null
  scopes: string[]
}): string {
  const redirectUri = buildGoogleConnectCallbackUrl({ callbackOrigin: options.callbackOrigin })
  const allScopes = Array.from(
    new Set([
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      ...options.scopes,
    ])
  )

  const state = Buffer.from(
    JSON.stringify({
      chefId: options.chefId,
      csrf: options.csrfToken,
      returnTo: sanitizeGoogleConnectReturnTo(options.returnTo),
    })
  ).toString('base64')

  const params = new URLSearchParams({
    client_id: options.clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: allScopes.join(' '),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state,
  })

  return `${GOOGLE_AUTHORIZE_URL}?${params.toString()}`
}
