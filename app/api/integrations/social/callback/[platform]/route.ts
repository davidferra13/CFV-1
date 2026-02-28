// GET /api/integrations/social/callback/[platform]
// OAuth callback: validates state, exchanges code for tokens, fetches account info,
// encrypts and persists credentials, then redirects to /social/connections.

import { NextResponse, type NextRequest } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOAuthConfig, getRedirectUri, SOCIAL_PLATFORMS } from '@/lib/social/oauth/config'
import { upsertCredential } from '@/lib/social/oauth/token-store'

// ── Token exchange ─────────────────────────────────────────────────────────────

async function exchangeCode(
  platform: string,
  code: string,
  codeVerifier: string | null
): Promise<{
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  scope?: string
}> {
  const config = getOAuthConfig(platform)!
  const clientId = process.env[config.clientIdEnv]!
  const clientSecret = process.env[config.clientSecretEnv]!
  const redirectUri = getRedirectUri(platform)

  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  if (config.usePKCE && codeVerifier) {
    body.code_verifier = codeVerifier
    if (platform === 'x') {
      // X uses HTTP Basic auth for token exchange
      headers['Authorization'] =
        'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    } else {
      body.client_id = clientId
      body.client_secret = clientSecret
    }
  } else {
    body.client_id = clientId
    body.client_secret = clientSecret
  }

  const res = await fetch(config.tokenUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Token exchange failed (${res.status}): ${text}`)
  }

  const data = await res.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    scope: data.scope,
  }
}

// ── Meta long-lived token exchange ────────────────────────────────────────────

async function toMetaLongLived(shortToken: string): Promise<string> {
  const clientId = process.env.META_APP_ID!
  const clientSecret = process.env.META_APP_SECRET!
  const url =
    `https://graph.facebook.com/v21.0/oauth/access_token` +
    `?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}` +
    `&fb_exchange_token=${encodeURIComponent(shortToken)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to exchange Meta short-lived token')
  const data = await res.json()
  return data.access_token as string
}

// ── Main handler ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, { params }: { params: { platform: string } }) {
  const { platform } = params
  const origin = request.nextUrl.origin

  const failRedirect = (msg: string) => {
    const url = new URL('/social/connections', origin)
    url.searchParams.set('error', encodeURIComponent(msg))
    url.searchParams.set('platform', platform)
    return NextResponse.redirect(url)
  }

  if (!SOCIAL_PLATFORMS.has(platform)) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 404 })
  }

  const errorParam = request.nextUrl.searchParams.get('error')
  if (errorParam === 'access_denied') return failRedirect('access_denied')
  if (errorParam) return failRedirect(errorParam)

  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  if (!code || !state) return failRedirect('Missing code or state')

  // Re-auth chef (session cookie is still valid after platform redirect)
  let user
  try {
    user = await requireChef()
  } catch {
    return failRedirect('Session expired — please try again')
  }

  const supabase: any = createAdminClient()

  // Validate CSRF state
  const { data: stateRow } = await supabase
    .from('social_oauth_states')
    .select('*')
    .eq('state', state)
    .eq('platform', platform)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!stateRow) return failRedirect('OAuth state invalid or expired — please try again')

  // CSRF: state must belong to the currently-logged-in chef
  if ((stateRow as any).tenant_id !== user.tenantId) return failRedirect('OAuth state mismatch')

  // Delete used state (one-time use)
  await supabase.from('social_oauth_states').delete().eq('state', state)

  const codeVerifier: string | null = (stateRow as any).code_verifier ?? null

  try {
    const tokens = await exchangeCode(platform, code, codeVerifier)
    const tenantId = user.tenantId!
    const scopes = tokens.scope?.split(/[, ]+/).filter(Boolean) ?? []

    // ── Instagram ────────────────────────────────────────────────────────────
    if (platform === 'instagram') {
      const longLived = await toMetaLongLived(tokens.accessToken)
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${longLived}`
      )
      const pagesData = await pagesRes.json()
      const pages: { id: string; name: string; access_token: string }[] = pagesData.data ?? []

      let igUserId: string | null = null
      let igUsername: string | null = null
      let fbPageId: string | null = null

      for (const page of pages) {
        const igRes = await fetch(
          `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        )
        const igData = await igRes.json()
        if (igData.instagram_business_account?.id) {
          igUserId = igData.instagram_business_account.id
          fbPageId = page.id
          const uRes = await fetch(
            `https://graph.facebook.com/v21.0/${igUserId}?fields=username,name&access_token=${page.access_token}`
          )
          const uData = await uRes.json()
          igUsername = uData.username ?? null
          break
        }
      }

      if (!igUserId)
        throw new Error('No Instagram Business Account found on this Facebook account.')

      await upsertCredential({
        tenantId,
        platform: 'instagram',
        externalAccountId: igUserId,
        externalAccountName: igUsername,
        externalAccountUsername: igUsername ? `@${igUsername}` : null,
        accessToken: longLived,
        refreshToken: null,
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        additionalData: { facebook_page_id: fbPageId, instagram_user_id: igUserId },
        scopes,
      })
    }

    // ── Facebook ──────────────────────────────────────────────────────────────
    else if (platform === 'facebook') {
      const longLived = await toMetaLongLived(tokens.accessToken)
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${longLived}`
      )
      const pagesData = await pagesRes.json()
      const page = pagesData.data?.[0] as { id: string; name: string; access_token: string }

      if (!page) throw new Error('No Facebook Business Page found on this account.')

      await upsertCredential({
        tenantId,
        platform: 'facebook',
        externalAccountId: page.id,
        externalAccountName: page.name,
        externalAccountUsername: null,
        accessToken: page.access_token, // page access token (non-expiring)
        refreshToken: null,
        tokenExpiresAt: null, // page access tokens don't expire
        additionalData: { facebook_page_id: page.id, facebook_page_name: page.name },
        scopes,
      })
    }

    // ── TikTok ────────────────────────────────────────────────────────────────
    else if (platform === 'tiktok') {
      const userRes = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name',
        { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
      )
      const userData = await userRes.json()
      const tikUser = userData.data?.user ?? {}

      await upsertCredential({
        tenantId,
        platform: 'tiktok',
        externalAccountId: tikUser.union_id ?? tikUser.open_id ?? 'unknown',
        externalAccountName: tikUser.display_name ?? null,
        externalAccountUsername: null,
        externalAccountAvatarUrl: tikUser.avatar_url ?? null,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        tokenExpiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : new Date(Date.now() + 24 * 60 * 60 * 1000), // default 24h
        additionalData: { open_id: tikUser.open_id },
        scopes,
      })
    }

    // ── LinkedIn ──────────────────────────────────────────────────────────────
    else if (platform === 'linkedin') {
      const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      const userData = await userRes.json()

      await upsertCredential({
        tenantId,
        platform: 'linkedin',
        externalAccountId: userData.sub ?? 'unknown',
        externalAccountName: userData.name ?? null,
        externalAccountUsername: userData.email ?? null,
        externalAccountAvatarUrl: userData.picture ?? null,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        // LinkedIn access tokens expire in 60 days
        tokenExpiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        additionalData: { urn: `urn:li:person:${userData.sub}` },
        scopes,
      })
    }

    // ── X ─────────────────────────────────────────────────────────────────────
    else if (platform === 'x') {
      const userRes = await fetch('https://api.twitter.com/2/users/me', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      const userData = await userRes.json()
      const xUser = userData.data ?? {}

      await upsertCredential({
        tenantId,
        platform: 'x',
        externalAccountId: xUser.id ?? 'unknown',
        externalAccountName: xUser.name ?? null,
        externalAccountUsername: xUser.username ? `@${xUser.username}` : null,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        // X access tokens expire in 2 hours
        tokenExpiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : new Date(Date.now() + 2 * 60 * 60 * 1000),
        additionalData: {},
        scopes,
      })
    }

    // ── Pinterest ─────────────────────────────────────────────────────────────
    else if (platform === 'pinterest') {
      const userRes = await fetch('https://api.pinterest.com/v5/user_account', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      const userData = await userRes.json()

      const boardsRes = await fetch('https://api.pinterest.com/v5/boards?page_size=5', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` },
      })
      const boardsData = await boardsRes.json()
      const firstBoard = boardsData.items?.[0]

      await upsertCredential({
        tenantId,
        platform: 'pinterest',
        externalAccountId: userData.username ?? 'unknown',
        externalAccountName: userData.username ?? null,
        externalAccountUsername: userData.username ? `@${userData.username}` : null,
        externalAccountAvatarUrl: userData.profile_image ?? null,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        tokenExpiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Pinterest ~30 days
        additionalData: {
          default_board_id: firstBoard?.id ?? null,
          default_board_name: firstBoard?.name ?? null,
        },
        scopes,
      })
    }

    // ── YouTube Shorts ────────────────────────────────────────────────────────
    else if (platform === 'youtube_shorts') {
      const channelRes = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
      )
      const channelData = await channelRes.json()
      const channel = channelData.items?.[0]

      await upsertCredential({
        tenantId,
        platform: 'youtube_shorts',
        externalAccountId: channel?.id ?? 'unknown',
        externalAccountName: channel?.snippet?.title ?? null,
        externalAccountUsername: channel?.snippet?.customUrl ?? null,
        externalAccountAvatarUrl: channel?.snippet?.thumbnails?.default?.url ?? null,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        // Google access tokens expire in 1 hour; refresh token is permanent
        tokenExpiresAt: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000)
          : new Date(Date.now() + 60 * 60 * 1000),
        additionalData: { channel_id: channel?.id },
        scopes,
      })
    }

    // Success — send chef back to connections page
    const successUrl = new URL('/social/connections', origin)
    successUrl.searchParams.set('connected', platform)
    return NextResponse.redirect(successUrl)
  } catch (err) {
    console.error(`[social-callback][${platform}]`, err)
    return failRedirect((err as Error).message.slice(0, 200))
  }
}
