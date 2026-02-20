// Google Business OAuth: Step 1 — Redirect to Google authorization URL
// Requires: GOOGLE_CLIENT_ID env var (from Google Cloud Console)
// Scope: https://www.googleapis.com/auth/business.manage (Google My Business)

import { NextRequest, NextResponse } from 'next/server'
import { requireChef } from '@/lib/auth/get-user'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const chef = await requireChef()

    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/social/google/callback`

    if (!clientId) {
      return NextResponse.json({ error: 'Google integration not configured' }, { status: 503 })
    }

    const state = crypto.randomUUID()
    const supabase = createAdminClient()

    await supabase.from('social_oauth_states' as any).insert({
      tenant_id: chef.id,
      platform: 'google_business',
      state,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    })

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/business.manage')
    authUrl.searchParams.set('access_type', 'offline')
    authUrl.searchParams.set('prompt', 'consent')
    authUrl.searchParams.set('state', state)

    return NextResponse.redirect(authUrl.toString())
  } catch (err) {
    console.error('[google-connect]', err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings/integrations?error=google_connect_failed`)
  }
}
