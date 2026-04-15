import { NextRequest, NextResponse } from 'next/server'
import { resolveChefByAlias } from '@/lib/comms/email-channel'
import { ingestCommunicationEvent } from '@/lib/communication/pipeline'

// Cloudflare Email Worker POSTs here when an email arrives at {alias}@cheflowhq.com
// Worker format:
// POST /api/webhooks/email/inbound
// Header: X-Webhook-Secret: <INBOUND_EMAIL_WEBHOOK_SECRET>
// Body (JSON):
//   { from: string, to: string, subject: string, text: string, html?: string }

function extractAlias(toAddress: string): string {
  const local = toAddress.split('@')[0]?.toLowerCase() || ''
  return local
}

function extractSenderIdentity(from: string): string {
  // "Name <email@example.com>" -> keep as-is
  // "email@example.com" -> keep as-is
  return from.trim()
}

function buildRawContent(subject: string, text: string): string {
  const subjectLine = subject?.trim() || ''
  const body = text?.trim() || ''
  if (subjectLine && body) return `${subjectLine}\n\n${body}`
  return subjectLine || body
}

export async function POST(req: NextRequest) {
  // Verify shared secret
  const secret = req.headers.get('x-webhook-secret')
  const expected = process.env.INBOUND_EMAIL_WEBHOOK_SECRET
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    from?: string
    to?: string
    subject?: string
    text?: string
    html?: string
    message_id?: string
    thread_id?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { from, to, subject, text, message_id, thread_id } = body

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from or to' }, { status: 400 })
  }

  const alias = extractAlias(to)
  const chefId = await resolveChefByAlias(alias)

  if (!chefId) {
    // Unknown alias - not an error, just not routable
    return NextResponse.json({ ok: true, routed: false })
  }

  const rawContent = buildRawContent(subject || '', text || '')
  if (!rawContent) {
    return NextResponse.json({ ok: true, routed: false, reason: 'empty body' })
  }

  try {
    await ingestCommunicationEvent({
      tenantId: chefId,
      source: 'email',
      externalId: message_id || null,
      externalThreadKey: thread_id || null,
      timestamp: new Date().toISOString(),
      senderIdentity: extractSenderIdentity(from),
      rawContent,
      direction: 'inbound',
      ingestionSource: 'webhook',
      isRawSignalOnly: false, // direct inbound to chef's address is always triage-visible
    })

    return NextResponse.json({ ok: true, routed: true })
  } catch (err) {
    console.error('[email/inbound] Ingest failed:', err)
    return NextResponse.json({ error: 'Ingest failed' }, { status: 500 })
  }
}
