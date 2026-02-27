import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { exchangeQuickBooksCode } from '@/lib/integrations/quickbooks/quickbooks-client'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const realmId = url.searchParams.get('realmId')
  const error = url.searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3100'

  if (error) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=quickbooks_denied`)
  }

  if (!code || !state || !realmId) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=quickbooks_missing_params`)
  }

  const supabase = createServerClient({ admin: true })

  // Validate CSRF state
  const { data: oauthState } = await supabase
    .from('social_oauth_states')
    .select('tenant_id')
    .eq('state', state)
    .eq('platform', 'quickbooks')
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!oauthState) {
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=quickbooks_invalid_state`)
  }

  // Delete used state (one-time use)
  await supabase.from('social_oauth_states').delete().eq('state', state)

  try {
    await exchangeQuickBooksCode(code, realmId, oauthState.tenant_id)
    return NextResponse.redirect(`${appUrl}/settings/integrations?connected=quickbooks`)
  } catch (err) {
    console.error('[QuickBooks] OAuth callback error:', err)
    return NextResponse.redirect(`${appUrl}/settings/integrations?error=quickbooks_exchange_failed`)
  }
}
