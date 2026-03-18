// TikTok OAuth adapter - TikTok for Developers Content Posting API.
//
// TikTok uses OAuth 2.0 with mandatory PKCE (S256).
// Access tokens expire in 24h; refresh tokens are valid for 365 days.
//
// Required env vars:
//   TIKTOK_CLIENT_KEY    – TikTok app client key
//   TIKTOK_CLIENT_SECRET – TikTok app client secret
//   NEXT_PUBLIC_APP_URL  – Base URL of the deployed app

import type { PlatformAdapter, TokenSet, AccountInfo } from './types'
import { generateCodeChallenge } from './types'

const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize'
const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'
const TIKTOK_USER_URL = 'https://open.tiktokapis.com/v2/user/info/'

// Scopes required for posting video and reading basic profile info
const TIKTOK_SCOPES = 'user.info.basic,video.publish,video.upload'

function clientKey() {
  return process.env.TIKTOK_CLIENT_KEY!
}
function clientSecret() {
  return process.env.TIKTOK_CLIENT_SECRET!
}
function redirectUri() {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/social/callback/tiktok`
}

// ── Auth URL ──────────────────────────────────────────────────────────────────

async function buildAuthUrl(state: string, codeVerifier?: string): Promise<string> {
  if (!codeVerifier) throw new Error('TikTok requires PKCE - codeVerifier is mandatory')
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  const params = new URLSearchParams({
    client_key: clientKey(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: TIKTOK_SCOPES,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })
  return `${TIKTOK_AUTH_URL}?${params}`
}

// ── Code exchange ─────────────────────────────────────────────────────────────

async function exchangeCode(code: string, codeVerifier?: string): Promise<TokenSet> {
  if (!codeVerifier) throw new Error('TikTok PKCE: codeVerifier required')
  const body = new URLSearchParams({
    client_key: clientKey(),
    client_secret: clientSecret(),
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(),
    code_verifier: codeVerifier,
  })
  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`TikTok code exchange failed: ${err}`)
  }
  const data: {
    access_token: string
    refresh_token: string
    expires_in: number
    refresh_expires_in: number
    scope: string
  } = await res.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    scope: data.scope,
  }
}

// ── Token refresh ─────────────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    client_key: clientKey(),
    client_secret: clientSecret(),
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`TikTok token refresh failed: ${err}`)
  }
  const data: {
    access_token: string
    refresh_token: string
    expires_in: number
    scope: string
  } = await res.json()

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    scope: data.scope,
  }
}

// ── Account info ──────────────────────────────────────────────────────────────

async function getAccountInfo(accessToken: string): Promise<AccountInfo> {
  const params = new URLSearchParams({
    fields: 'open_id,display_name,avatar_url,username',
  })
  const res = await fetch(`${TIKTOK_USER_URL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('TikTok: failed to fetch user info')
  const data: {
    data: {
      user: {
        open_id: string
        display_name: string
        avatar_url: string
        username?: string
      }
    }
  } = await res.json()
  const user = data.data.user

  return {
    platformAccountId: user.open_id,
    platformAccountName: user.display_name,
    platformAccountHandle: user.username ? `@${user.username}` : null,
    platformAccountType: 'personal',
    platformAccountAvatar: user.avatar_url,
  }
}

// ── Adapter export ────────────────────────────────────────────────────────────

export const tiktokAdapter = {
  platform: 'tiktok' as const,
  buildAuthUrl: async (state: string, codeVerifier?: string) => buildAuthUrl(state, codeVerifier),
  exchangeCode,
  refreshAccessToken,
  getAccountInfo,
  requiresPkce: true,
  get redirectUri() {
    return redirectUri()
  },
} satisfies Omit<PlatformAdapter, 'buildAuthUrl'> & {
  buildAuthUrl: (s: string, v?: string) => Promise<string>
}
