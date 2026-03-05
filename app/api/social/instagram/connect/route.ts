// Instagram OAuth: Step 1 — Redirect to Instagram authorization URL
// Requires: INSTAGRAM_APP_ID env var (from Meta Developer App)
// The app must have instagram_basic, instagram_manage_insights permissions

import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const chef = await requireChef()

    const appId = process.env.INSTAGRAM_APP_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/instagram/callback`

    if (!appId) {
      return NextResponse.json({ error: 'Instagram integration not configured' }, { status: 503 })
    }

    // Generate CSRF state token
    const state = crypto.randomUUID()
    const supabase: any = createAdminClient()

    // Store state in social_oauth_states (created in social_connected_accounts migration)
    await supabase.from('social_oauth_states' as any).insert({
      tenant_id: chef.id,
      platform: 'instagram',
      state,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min
    })

    const scopes = [
      'instagram_basic',
      'instagram_manage_insights',
      'pages_show_list',
      'pages_read_engagement',
    ].join(',')

    const authUrl = new URL('https://api.instagram.com/oauth/authorize')
    authUrl.searchParams.set('client_id', appId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('state', state)

    return NextResponse.redirect(authUrl.toString())
  } catch (err) {
    console.error('[instagram-connect]', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=instagram_connect_failed`
    )
  }
}
