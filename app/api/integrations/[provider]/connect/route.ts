import { NextResponse, type NextRequest } from 'next/server'
import crypto from 'crypto'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { getProviderMeta } from '@/lib/integrations/core/providers'

export async function GET(
  _request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    await requireChef()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const meta = getProviderMeta(params.provider)
  if (!meta) {
    return NextResponse.json({ error: 'Unknown integration provider' }, { status: 404 })
  }

  if (meta.supportsOAuth) {
    return NextResponse.json({
      provider: meta.provider,
      status: 'pending_oauth_implementation',
      message: 'OAuth connect flow is scaffolded. Provider-specific auth implementation is the next phase.',
    })
  }

  return NextResponse.json({
    provider: meta.provider,
    status: 'manual_connect_available',
    message: 'Call POST on this endpoint to create a manual connection record.',
  })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  let user
  try {
    user = await requireChef()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const meta = getProviderMeta(params.provider)

  if (!meta) {
    return NextResponse.json({ error: 'Unknown integration provider' }, { status: 404 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    // Body is optional for manual connection creation.
  }

  const supabase: any = createServerClient()
  const webhookSecret = meta.supportsWebhook ? crypto.randomBytes(32).toString('hex') : null

  const payload = {
    chef_id: user.entityId,
    tenant_id: user.tenantId,
    provider: meta.provider,
    auth_type: (body.apiKey ? 'api_key' : 'none') as 'api_key' | 'none',
    status: 'connected',
    external_account_id: typeof body.externalAccountId === 'string' ? body.externalAccountId.trim() : null,
    external_account_name: typeof body.externalAccountName === 'string' ? body.externalAccountName.trim() : null,
    api_key: typeof body.apiKey === 'string' ? body.apiKey.trim() : null,
    webhook_secret: webhookSecret,
  }

  const { data, error } = await supabase
    .from('integration_connections')
    .insert(payload)
    .select('id, provider, webhook_secret')
    .single()

  if (error) {
    if (error.code === '23505') {
      const { data: existing } = await supabase
        .from('integration_connections')
        .select('id, provider, webhook_secret')
        .eq('tenant_id', user.tenantId)
        .eq('provider', meta.provider)
        .single()

      if (existing) {
        return NextResponse.json({ connected: true, existing: true, connection: existing })
      }
    }

    console.error('[Integration Connect] insert failed:', error)
    return NextResponse.json({ error: 'Failed to create integration connection' }, { status: 500 })
  }

  return NextResponse.json({ connected: true, existing: false, connection: data })
}
