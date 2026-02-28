import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import {
  createIntegrationEventFromWebhook,
  processIntegrationEvent,
} from '@/lib/integrations/core/pipeline'
import { INTEGRATION_PROVIDERS, type IntegrationProvider } from '@/lib/integrations/core/types'

const PROVIDER_SET = new Set<string>(INTEGRATION_PROVIDERS)

function parseProvider(value: string): IntegrationProvider | null {
  return PROVIDER_SET.has(value) ? (value as IntegrationProvider) : null
}

export async function POST(req: NextRequest, { params }: { params: { provider: string } }) {
  const provider = parseProvider(params.provider)
  if (!provider) {
    return NextResponse.json({ error: 'Unknown integration provider' }, { status: 404 })
  }

  // Static routes /api/webhooks/wix and /api/webhooks/stripe handle their own flows.
  // This dynamic route powers future generic provider connectors.
  if (provider === 'wix') {
    return NextResponse.json({ error: 'Use /api/webhooks/wix' }, { status: 400 })
  }

  let payload: Record<string, unknown>
  try {
    const body = await req.text()
    payload = body ? JSON.parse(body) : {}
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Only accept secret via header — never via query string (leaks into access logs)
  const secret = req.headers.get('x-chefflow-webhook-secret')
  if (!secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase: any = createServerClient({ admin: true })
  const { data: connection, error: connError } = await supabase
    .from('integration_connections')
    .select('id, tenant_id')
    .eq('provider', provider)
    .eq('webhook_secret', secret)
    .eq('status', 'connected')
    .single()

  if (connError || !connection) {
    return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 })
  }

  try {
    const created = await createIntegrationEventFromWebhook({
      tenantId: connection.tenant_id as string,
      provider,
      connectionId: connection.id as string,
      payload,
    })

    if (created.id) {
      processIntegrationEvent(created.id).catch((error) => {
        console.error('[Generic Integration Webhook] async process error:', error)
      })
    }

    return NextResponse.json({
      received: true,
      cached: created.cached,
      eventId: created.id,
    })
  } catch (error) {
    console.error('[Generic Integration Webhook] ingest error:', error)
    return NextResponse.json({ error: 'Failed to ingest event' }, { status: 500 })
  }
}
