// YouTube Shorts OAuth adapter — Google OAuth 2.0.
//
// YouTube uses Google's OAuth 2.0 system (same app as Google Calendar if configured).
// Access tokens expire in 1 hour; refresh tokens are long-lived if the user granted
// offline access.
//
// Required env vars:
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   NEXT_PUBLIC_APP_URL

import type { PlatformAdapter, TokenSet, AccountInfo } from './types'

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const YT_CHANNEL_URL = 'https://www.googleapis.com/youtube/v3/channels'

// youtube.upload = required to upload videos (including Shorts)
const YT_SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')

function clientId() {
  return process.env.GOOGLE_CLIENT_ID!
}
function clientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET!
}
function redirectUri() {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/social/callback/youtube`
}

// ── Auth URL ──────────────────────────────────────────────────────────────────

function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: YT_SCOPES,
    state,
    access_type: 'offline', // request refresh token
    prompt: 'consent', // ensure refresh token is issued even on re-auth
  })
  return `${GOOGLE_AUTH_URL}?${params}`
}

// ── Code exchange ─────────────────────────────────────────────────────────────

async function exchangeCode(code: string): Promise<TokenSet> {
  const body = new URLSearchParams({
    code,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code',
  })
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`YouTube code exchange failed: ${err}`)
  }
  const data: {
    access_token: string
    refresh_token?: string
    expires_in: number
    scope: string
    token_type: string
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
    client_id: clientId(),
    client_secret: clientSecret(),
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`YouTube token refresh failed: ${err}`)
  }
  const data: {
    access_token: string
    expires_in: number
    scope: string
  } = await res.json()

  return {
    accessToken: data.access_token,
    refreshToken, // Google doesn't re-issue refresh tokens; keep the existing one
    expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    scope: data.scope,
  }
}

// ── Account info ──────────────────────────────────────────────────────────────

async function getAccountInfo(accessToken: string): Promise<AccountInfo> {
  // Fetch the YouTube channel associated with the authenticated account
  const params = new URLSearchParams({
    part: 'snippet',
    mine: 'true',
  })
  const res = await fetch(`${YT_CHANNEL_URL}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('YouTube: failed to fetch channel info')
  const data: {
    items?: Array<{
      id: string
      snippet: { title: string; customUrl?: string; thumbnails?: { default?: { url: string } } }
    }>
  } = await res.json()

  const channel = data.items?.[0]
  if (!channel) throw new Error('YouTube: no channel found for this account')

  return {
    platformAccountId: channel.id,
    platformAccountName: channel.snippet.title,
    platformAccountHandle: channel.snippet.customUrl
      ? `@${channel.snippet.customUrl.replace(/^@/, '')}`
      : null,
    platformAccountType: 'personal',
    platformAccountAvatar: channel.snippet.thumbnails?.default?.url ?? null,
  }
}

// ── Adapter export ────────────────────────────────────────────────────────────

export const youtubeAdapter: PlatformAdapter = {
  platform: 'youtube_shorts',
  buildAuthUrl,
  exchangeCode,
  refreshAccessToken,
  getAccountInfo,
  requiresPkce: false,
  get redirectUri() {
    return redirectUri()
  },
}
