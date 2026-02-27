import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { exchangeSquareCode } from '@/lib/integrations/square/square-client'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100'

  if (error) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=square_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=square_missing_params`)
  }

  const supabase = createServerClient({ admin: true })

  // Validate CSRF state
  const { data: oauthState } = await supabase
    .from('social_oauth_states')
    .select('tenant_id')
    .eq('state', state)
    .eq('platform', 'square')
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!oauthState) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=square_invalid_state`)
  }

  await supabase.from('social_oauth_states').delete().eq('state', state)

  try {
    await exchangeSquareCode(code, oauthState.tenant_id)
    return NextResponse.redirect(`${appUrl}/settings/integrations?connected=square`)
  } catch (err) {
    console.error('[Square] OAuth callback error:', err)
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=square_exchange_failed`)
  }
}
