// Google Business OAuth: Step 2 - Exchange code for tokens, store connection

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const redirectBase = `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations`

  if (error) return NextResponse.redirect(`${redirectBase}?error=google_denied`)
  if (!code || !state) return NextResponse.redirect(`${redirectBase}?error=google_invalid_callback`)

  const supabase: any = createAdminClient()

  // Validate state
  const { data: stateRow } = await supabase
    .from('social_oauth_states')
    .select('tenant_id, expires_at')
    .eq('state', state)
    .eq('platform', 'google_business')
    .single()

  if (!stateRow || new Date(stateRow.expires_at) < new Date()) {
    return NextResponse.redirect(`${redirectBase}?error=google_state_expired`)
  }

  const chefId = stateRow.tenant_id
  await supabase.from('social_oauth_states').delete().eq('state', state)

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/social/google/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    console.error('[google-callback] token exchange failed:', await tokenRes.text())
    return NextResponse.redirect(`${redirectBase}?error=google_token_failed`)
  }

  const {
    access_token,
    refresh_token,
    expires_in,
  }: { access_token: string; refresh_token?: string; expires_in?: number } = await tokenRes.json()
  const expiresAt = new Date(Date.now() + (expires_in ?? 3599) * 1000).toISOString()

  // Get account info
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  const profile: { id?: string; name?: string; email?: string } = await profileRes.json()

  // Upsert in social_platform_credentials (used by Google for reviews)
  await supabase.from('social_platform_credentials').upsert(
    {
      tenant_id: chefId,
      platform: 'google_business',
      external_account_id: profile.id ?? 'unknown',
      external_account_name: profile.name ?? null,
      external_account_username: profile.email ?? null,
      access_token,
      refresh_token: refresh_token ?? null,
      token_expires_at: expiresAt,
      is_active: true,
      connected_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,platform' }
  )

  // Trigger initial sync
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/social/google/sync`, {
    method: 'POST',
    headers: { 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
    body: JSON.stringify({ chefId }),
  })

  return NextResponse.redirect(`${redirectBase}?connected=google`)
}
