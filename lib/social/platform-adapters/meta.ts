// Meta OAuth adapter - covers Instagram Business and Facebook Pages.
//
// Meta uses a single OAuth app for both platforms. The flow:
//   1. Chef authorises via facebook.com/dialog/oauth with combined scopes.
//   2. Callback exchanges the short-lived code for a short-lived user access token.
//   3. We immediately exchange that for a long-lived token (60-day expiry).
//   4. We list the chef's FB Pages and let them pick one (UI step - callback stores
//      the first page found; the UI lets them switch if they have multiple).
//   5. The chosen page's Page Access Token is stored for Facebook posts.
//   6. If that page has a linked Instagram Business account, its ID is also stored.
//
// Required env vars:
//   META_APP_ID         – Facebook App ID
//   META_APP_SECRET     – Facebook App Secret
//   NEXT_PUBLIC_APP_URL – Base URL of the deployed app (for redirect_uri)

import type { PlatformAdapter, TokenSet, AccountInfo } from './types'

const BASE_URL = 'https://graph.facebook.com/v20.0'

// Scopes required for both IG and FB publishing via the Meta API.
const META_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_insights',
  'public_profile',
].join(',')

function appId() {
  return process.env.META_APP_ID!
}
function appSecret() {
  return process.env.META_APP_SECRET!
}
function redirectUri() {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/social/callback/meta`
}

// ── Auth URL ──────────────────────────────────────────────────────────────────

function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: appId(),
    redirect_uri: redirectUri(),
    scope: META_SCOPES,
    response_type: 'code',
    state,
  })
  return `https://www.facebook.com/v20.0/dialog/oauth?${params}`
}

// ── Code exchange ─────────────────────────────────────────────────────────────

async function exchangeCode(code: string): Promise<TokenSet> {
  // Step 1: Exchange code for a short-lived user token
  const params = new URLSearchParams({
    client_id: appId(),
    client_secret: appSecret(),
    redirect_uri: redirectUri(),
    code,
  })
  const res = await fetch(`${BASE_URL}/oauth/access_token?${params}`)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Meta code exchange failed: ${err}`)
  }
  const shortLived: { access_token: string; token_type: string } = await res.json()

  // Step 2: Exchange for a long-lived token (60-day)
  const longParams = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId(),
    client_secret: appSecret(),
    fb_exchange_token: shortLived.access_token,
  })
  const longRes = await fetch(`${BASE_URL}/oauth/access_token?${longParams}`)
  if (!longRes.ok) {
    const err = await longRes.text()
    throw new Error(`Meta long-lived token exchange failed: ${err}`)
  }
  const longLived: { access_token: string; expires_in?: number } = await longRes.json()

  const expiresAt = longLived.expires_in
    ? new Date(Date.now() + longLived.expires_in * 1000).toISOString()
    : null

  return {
    accessToken: longLived.access_token,
    refreshToken: null, // Meta doesn't issue refresh tokens; chefs re-auth before expiry
    expiresAt,
    scope: META_SCOPES,
  }
}

// ── Token refresh ─────────────────────────────────────────────────────────────
// Meta long-lived tokens can be refreshed by requesting a new long-lived token
// with the existing one before it expires.

async function refreshAccessToken(currentToken: string): Promise<TokenSet> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId(),
    client_secret: appSecret(),
    fb_exchange_token: currentToken,
  })
  const res = await fetch(`${BASE_URL}/oauth/access_token?${params}`)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Meta token refresh failed: ${err}`)
  }
  const data: { access_token: string; expires_in?: number } = await res.json()
  const expiresAt = data.expires_in
    ? new Date(Date.now() + data.expires_in * 1000).toISOString()
    : null

  return {
    accessToken: data.access_token,
    refreshToken: null,
    expiresAt,
    scope: META_SCOPES,
  }
}

// ── Account info ──────────────────────────────────────────────────────────────

async function getAccountInfo(accessToken: string): Promise<AccountInfo> {
  // Fetch the user's FB profile
  const meParams = new URLSearchParams({
    access_token: accessToken,
    fields: 'id,name,picture.type(large)',
  })
  const meRes = await fetch(`${BASE_URL}/me?${meParams}`)
  if (!meRes.ok) throw new Error('Meta: failed to fetch user profile')
  const me: { id: string; name: string; picture?: { data: { url: string } } } = await meRes.json()

  // Fetch the first Facebook Page the user manages
  const pagesParams = new URLSearchParams({
    access_token: accessToken,
    fields: 'id,name,access_token,instagram_business_account',
    limit: '10',
  })
  const pagesRes = await fetch(`${BASE_URL}/me/accounts?${pagesParams}`)
  if (!pagesRes.ok) throw new Error('Meta: failed to fetch managed pages')
  const pagesData: {
    data: Array<{
      id: string
      name: string
      access_token: string
      instagram_business_account?: { id: string }
    }>
  } = await pagesRes.json()

  // Use the first page found (UI can let chef pick a different one later)
  const page = pagesData.data[0] ?? null

  return {
    platformAccountId: me.id,
    platformAccountName: me.name,
    platformAccountHandle: null,
    platformAccountType: page ? 'page' : 'personal',
    platformAccountAvatar: me.picture?.data?.url ?? null,
    metaPageId: page?.id ?? null,
    metaPageName: page?.name ?? null,
    metaIgAccountId: page?.instagram_business_account?.id ?? null,
  }
}

// ── Adapter export ────────────────────────────────────────────────────────────

export const metaAdapter: PlatformAdapter = {
  platform: 'instagram', // used as the canonical adapter key; callback route handles both ig+fb
  buildAuthUrl,
  exchangeCode,
  refreshAccessToken,
  getAccountInfo,
  requiresPkce: false,
  get redirectUri() {
    return redirectUri()
  },
}
