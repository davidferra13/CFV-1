import { GOOGLE_CONNECT_CALLBACK_PATH, sanitizeGoogleConnectReturnTo } from './connect-shared'

export const GOOGLE_OAUTH_CSRF_COOKIE = 'google-oauth-csrf'

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const LOCAL_DEV_ORIGIN = 'http://localhost:3100'

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

export function resolveGoogleConnectOrigin(options?: {
  siteUrl?: string | null
  requestOrigin?: string | null
  nodeEnv?: string
}): string {
  const requestOrigin = normalizeOrigin(options?.requestOrigin)
  const siteOrigin = normalizeOrigin(options?.siteUrl)
  const nodeEnv = options?.nodeEnv ?? process.env.NODE_ENV

  if (nodeEnv !== 'production') {
    return requestOrigin ?? siteOrigin ?? LOCAL_DEV_ORIGIN
  }

  return siteOrigin ?? requestOrigin ?? LOCAL_DEV_ORIGIN
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
