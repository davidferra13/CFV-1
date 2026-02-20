// X (Twitter) OAuth 2.0 adapter — uses PKCE (S256).
//
// Access tokens expire in ~2 hours; refresh tokens are long-lived (offline.access scope).
// X requires PKCE and sends tokens back via Authorization Code with PKCE (PKCE + confidential client).
//
// Required env vars:
//   X_CLIENT_ID     – X OAuth 2.0 client ID
//   X_CLIENT_SECRET – X OAuth 2.0 client secret
//   NEXT_PUBLIC_APP_URL

import type { PlatformAdapter, TokenSet, AccountInfo } from './types'
import { generateCodeChallenge } from './types'

const X_AUTH_URL = 'https://twitter.com/i/oauth2/authorize'
const X_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token'
const X_USER_URL = 'https://api.twitter.com/2/users/me'

// offline.access enables refresh tokens
const X_SCOPES = 'tweet.write tweet.read users.read offline.access'

function clientId() {
  return process.env.X_CLIENT_ID!
}
function clientSecret() {
  return process.env.X_CLIENT_SECRET!
}
function redirectUri() {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/social/callback/x`
}

function basicAuth() {
  return Buffer.from(`${clientId()}:${clientSecret()}`).toString('base64')
}

// ── Auth URL ──────────────────────────────────────────────────────────────────

async function buildAuthUrl(state: string, codeVerifier?: string): Promise<string> {
  if (!codeVerifier) throw new Error('X requires PKCE — codeVerifier is mandatory')
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId(),
    redirect_uri: redirectUri(),
    scope: X_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${X_AUTH_URL}?${params}`
}

// ── Code exchange ─────────────────────────────────────────────────────────────

async function exchangeCode(code: string, codeVerifier?: string): Promise<TokenSet> {
  if (!codeVerifier) throw new Error('X PKCE: codeVerifier required')
  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: clientId(),
    redirect_uri: redirectUri(),
    code_verifier: codeVerifier,
  })
  const res = await fetch(X_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth()}`,
    },
    body,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`X code exchange failed: ${err}`)
  }
  const data: {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope: string
  } = await res.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    scope: data.scope,
  }
}

// ── Token refresh ─────────────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId(),
  })
  const res = await fetch(X_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth()}`,
    },
    body,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`X token refresh failed: ${err}`)
  }
  const data: {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope: string
  } = await res.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    scope: data.scope,
  }
}

// ── Account info ──────────────────────────────────────────────────────────────

async function getAccountInfo(accessToken: string): Promise<AccountInfo> {
  const params = new URLSearchParams({
    'user.fields': 'id,name,username,profile_image_url',
  })
  const res = await fetch(`${X_USER_URL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('X: failed to fetch user info')
  const data: {
    data: { id: string; name: string; username: string; profile_image_url?: string }
  } = await res.json()
  const user = data.data

  return {
    platformAccountId: user.id,
    platformAccountName: user.name,
    platformAccountHandle: `@${user.username}`,
    platformAccountType: 'personal',
    platformAccountAvatar: user.profile_image_url ?? null,
  }
}

// ── Adapter export ────────────────────────────────────────────────────────────

export const xAdapter = {
  platform: 'x' as const,
  buildAuthUrl: async (state: string, codeVerifier?: string) =>
    buildAuthUrl(state, codeVerifier),
  exchangeCode,
  refreshAccessToken,
  getAccountInfo,
  requiresPkce: true,
  get redirectUri() {
    return redirectUri()
  },
}
