// Instagram OAuth: Step 2 - Handle callback, exchange code for token, store connection
// Called by Instagram after user grants permissions

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const redirectBase = `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations`

  if (error) {
    return NextResponse.redirect(`${redirectBase}?error=instagram_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${redirectBase}?error=instagram_invalid_callback`)
  }

  const supabase: any = createAdminClient()

  // Validate state
  const { data: stateRow } = await supabase
    .from('social_oauth_states')
    .select('tenant_id, expires_at')
    .eq('state', state)
    .eq('platform', 'instagram')
    .single()

  if (!stateRow || new Date(stateRow.expires_at) < new Date()) {
    return NextResponse.redirect(`${redirectBase}?error=instagram_state_expired`)
  }

  const chefId = stateRow.tenant_id

  // Delete used state
  await supabase.from('social_oauth_states').delete().eq('state', state)

  // Exchange code for short-lived token
  const appId = process.env.INSTAGRAM_APP_ID!
  const appSecret = process.env.INSTAGRAM_APP_SECRET!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/instagram/callback`

  const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    }),
  })

  if (!tokenRes.ok) {
    console.error('[instagram-callback] token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(`${redirectBase}?error=instagram_token_failed`)
  }

  const {
    access_token: shortToken,
    user_id: igUserId,
  }: { access_token: string; user_id: string | number } = await tokenRes.json()

  // Exchange for long-lived token (60 days)
  const longTokenRes = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortToken}`
  )

  const { access_token: longToken, expires_in }: { access_token: string; expires_in?: number } =
    await longTokenRes.json()
  const expiresAt = new Date(Date.now() + (expires_in ?? 5183944) * 1000).toISOString()

  // Get account info
  const profileRes = await fetch(
    `https://graph.instagram.com/me?fields=id,username,name,followers_count,media_count&access_token=${longToken}`
  )
  const profile: {
    id?: string
    username?: string
    name?: string
    followers_count?: number
    media_count?: number
  } = await profileRes.json()

  // Upsert connection
  await supabase.from('social_connected_accounts').upsert(
    {
      tenant_id: chefId,
      platform: 'instagram',
      access_token: longToken,
      token_expires_at: expiresAt,
      platform_account_id: String(igUserId),
      platform_account_handle: profile.username ?? null,
      platform_account_name: profile.name ?? null,
      platform_account_type: 'creator',
      is_active: true,
      connected_at: new Date().toISOString(),
      last_refreshed_at: new Date().toISOString(),
      error_count: 0,
    },
    { onConflict: 'tenant_id,platform' }
  )

  // Trigger initial sync
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/social/instagram/sync`, {
    method: 'POST',
    headers: { 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
    body: JSON.stringify({ chefId }),
  })

  return NextResponse.redirect(`${redirectBase}?connected=instagram`)
}
