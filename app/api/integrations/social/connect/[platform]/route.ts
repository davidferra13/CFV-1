// GET /api/integrations/social/connect/[platform]
// Initiates the OAuth flow: generates CSRF state (+ PKCE for X and TikTok),
// stores it in social_oauth_states, then redirects to the platform's auth page.

import { NextResponse, type NextRequest } from 'next/server'
import crypto from 'crypto'
import { requireChef } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/db/admin'
import { getOAuthConfig, getRedirectUri, SOCIAL_PLATFORMS } from '@/lib/social/oauth/config'

function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')
  return { codeVerifier, codeChallenge }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params
  const origin = request.nextUrl.origin

  const failRedirect = (code: string) => {
    const url = new URL('/social/connections', origin)
    url.searchParams.set('error', code)
    url.searchParams.set('platform', platform)
    return NextResponse.redirect(url)
  }

  if (!SOCIAL_PLATFORMS.has(platform)) {
    return NextResponse.json({ error: 'Unknown platform' }, { status: 404 })
  }

  let user
  try {
    user = await requireChef()
  } catch {
    return NextResponse.redirect(new URL('/auth/signin', origin))
  }

  if (!user.tenantId) {
    return failRedirect('config_error')
  }

  const config = getOAuthConfig(platform)
  if (!config) return failRedirect('config_error')

  const clientId = process.env[config.clientIdEnv]
  if (!clientId) {
    console.error(`[social-connect] ${config.clientIdEnv} not set`)
    return failRedirect('config_error')
  }

  // CSRF state (+ PKCE for X and TikTok)
  const state = crypto.randomBytes(24).toString('hex')
  let codeVerifier: string | null = null
  let codeChallenge: string | null = null

  if (config.usePKCE) {
    const pkce = generatePKCE()
    codeVerifier = pkce.codeVerifier
    codeChallenge = pkce.codeChallenge
  }

  const db: any = createAdminClient()
  const { error: stateErr } = await db.from('social_oauth_states').insert({
    tenant_id: user.tenantId,
    platform,
    state,
    code_verifier: codeVerifier,
    redirect_to: '/social/connections',
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  })

  if (stateErr) {
    console.error('[social-connect] state insert failed:', stateErr)
    return failRedirect('state_error')
  }

  const redirectUri = getRedirectUri(platform)
  const authUrl = new URL(config.authUrl)
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('response_type', 'code')

  // Meta uses comma-separated scopes; all others use spaces
  const scopeStr = config.scopes.join(
    platform === 'instagram' || platform === 'facebook' ? ',' : ' '
  )
  authUrl.searchParams.set('scope', scopeStr)

  if (config.usePKCE && codeChallenge) {
    authUrl.searchParams.set('code_challenge', codeChallenge)
    authUrl.searchParams.set('code_challenge_method', 'S256')
  }

  // YouTube requires offline access to get a refresh token
  if (platform === 'youtube_shorts') {
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
  }

  return NextResponse.redirect(authUrl.toString())
}
