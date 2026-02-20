// Pinterest OAuth 2.0 adapter — Pinterest API v5.
//
// Pinterest uses standard OAuth 2.0 (no PKCE required).
// Access tokens are long-lived (no documented expiry — treat as non-expiring).
// Refresh tokens are returned but expiry varies.
//
// Required env vars:
//   PINTEREST_APP_ID
//   PINTEREST_APP_SECRET
//   NEXT_PUBLIC_APP_URL

import type { PlatformAdapter, TokenSet, AccountInfo } from './types'

const PIN_AUTH_URL = 'https://www.pinterest.com/oauth/'
const PIN_TOKEN_URL = 'https://api.pinterest.com/v5/oauth/token'
const PIN_USER_URL = 'https://api.pinterest.com/v5/user_account'

// pins:write = create pins; boards:read = list boards for pin destination
const PIN_SCOPES = 'pins:write,boards:read,user_accounts:read'

function appId() {
  return process.env.PINTEREST_APP_ID!
}
function appSecret() {
  return process.env.PINTEREST_APP_SECRET!
}
function redirectUri() {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/social/callback/pinterest`
}
function basicAuth() {
  return Buffer.from(`${appId()}:${appSecret()}`).toString('base64')
}

// ── Auth URL ──────────────────────────────────────────────────────────────────

function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: appId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: PIN_SCOPES,
    state,
  })
  return `${PIN_AUTH_URL}?${params}`
}

// ── Code exchange ─────────────────────────────────────────────────────────────

async function exchangeCode(code: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
  })
  const res = await fetch(PIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth()}`,
    },
    body,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Pinterest code exchange failed: ${err}`)
  }
  const data: {
    access_token: string
    refresh_token?: string
    token_type: string
    expires_in?: number
    scope: string
  } = await res.json()

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt,
    scope: data.scope,
  }
}

// ── Token refresh ─────────────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  const res = await fetch(PIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth()}`,
    },
    body,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Pinterest token refresh failed: ${err}`)
  }
  const data: {
    access_token: string
    refresh_token?: string
    expires_in?: number
    scope: string
  } = await res.json()

  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt,
    scope: data.scope,
  }
}

// ── Account info ──────────────────────────────────────────────────────────────

async function getAccountInfo(accessToken: string): Promise<AccountInfo> {
  const res = await fetch(PIN_USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('Pinterest: failed to fetch user account')
  const data: {
    username: string
    account_type: string
    profile_image: string
    website_url?: string
  } = await res.json()

  return {
    platformAccountId: data.username, // Pinterest uses username as the primary identifier
    platformAccountName: data.username,
    platformAccountHandle: `@${data.username}`,
    platformAccountType: data.account_type?.toLowerCase() ?? 'personal',
    platformAccountAvatar: data.profile_image,
  }
}

// ── Adapter export ────────────────────────────────────────────────────────────

export const pinterestAdapter: PlatformAdapter = {
  platform: 'pinterest',
  buildAuthUrl,
  exchangeCode,
  refreshAccessToken,
  getAccountInfo,
  requiresPkce: false,
  get redirectUri() {
    return redirectUri()
  },
}
