// LinkedIn OAuth 2.0 adapter.
//
// LinkedIn uses standard OAuth 2.0 (no PKCE required).
// Access tokens expire in 60 days; refresh tokens expire in 1 year.
// Requires LinkedIn Marketing Developer Platform access for ugcPost API.
//
// Required env vars:
//   LINKEDIN_CLIENT_ID
//   LINKEDIN_CLIENT_SECRET
//   NEXT_PUBLIC_APP_URL

import type { PlatformAdapter, TokenSet, AccountInfo } from './types'

const LI_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
const LI_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
const LI_USER_URL = 'https://api.linkedin.com/v2/userinfo'

// openid + profile are needed for userinfo; w_member_social for posting
const LI_SCOPES = 'openid profile w_member_social'

function clientId() {
  return process.env.LINKEDIN_CLIENT_ID!
}
function clientSecret() {
  return process.env.LINKEDIN_CLIENT_SECRET!
}
function redirectUri() {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/social/callback/linkedin`
}

// ── Auth URL ──────────────────────────────────────────────────────────────────

function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId(),
    redirect_uri: redirectUri(),
    scope: LI_SCOPES,
    state,
  })
  return `${LI_AUTH_URL}?${params}`
}

// ── Code exchange ─────────────────────────────────────────────────────────────

async function exchangeCode(code: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(),
    client_id: clientId(),
    client_secret: clientSecret(),
  })
  const res = await fetch(LI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LinkedIn code exchange failed: ${err}`)
  }
  const data: {
    access_token: string
    refresh_token?: string
    expires_in: number
    refresh_token_expires_in?: number
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
    client_secret: clientSecret(),
  })
  const res = await fetch(LI_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`LinkedIn token refresh failed: ${err}`)
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
  // OpenID Connect userinfo endpoint (requires openid + profile scopes)
  const res = await fetch(LI_USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('LinkedIn: failed to fetch user info')
  const data: {
    sub: string
    name: string
    given_name?: string
    family_name?: string
    picture?: string
  } = await res.json()

  return {
    platformAccountId: data.sub,
    platformAccountName: data.name,
    platformAccountHandle: null, // LinkedIn doesn't have @handles
    platformAccountType: 'personal',
    platformAccountAvatar: data.picture ?? null,
  }
}

// ── Adapter export ────────────────────────────────────────────────────────────

export const linkedinAdapter: PlatformAdapter = {
  platform: 'linkedin',
  buildAuthUrl,
  exchangeCode,
  refreshAccessToken,
  getAccountInfo,
  requiresPkce: false,
  get redirectUri() {
    return redirectUri()
  },
}
