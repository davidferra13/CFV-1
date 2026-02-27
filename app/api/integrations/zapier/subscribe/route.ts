import { NextRequest, NextResponse } from 'next/server'
import {
  createWebhookSubscription,
  listWebhookSubscriptions,
  deleteWebhookSubscription,
} from '@/lib/integrations/zapier/zapier-webhooks'

// Zapier REST Hook subscription endpoints.
// POST = subscribe (Zapier calls this when a Zap is turned on)
// GET = list subscriptions
// DELETE = unsubscribe (Zapier calls this when a Zap is turned off)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await createWebhookSubscription({
      targetUrl: body.hookUrl || body.target_url,
      eventTypes: body.event_types || ['inquiry.created'],
    })
    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Subscription failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function GET() {
  try {
    const subs = await listWebhookSubscriptions()
    return NextResponse.json(subs)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to list subscriptions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing subscription ID' }, { status: 400 })

    await deleteWebhookSubscription(id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Delete failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
