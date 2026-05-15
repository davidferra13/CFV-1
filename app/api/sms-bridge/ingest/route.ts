import { NextRequest, NextResponse } from 'next/server'
import { createLogger } from '@/lib/logger'
import {
  resolveTokenTenant,
  isBlocked,
  incrementForwarded,
  incrementBlocked,
} from '@/lib/sms-bridge/config'
import { ingestCommunicationEvent } from '@/lib/communication/pipeline'
import { logCommunicationMessageCompat } from '@/lib/communication/messages-compat'
import { normalizePhone, isValidE164 } from '@/lib/calling/phone-utils'

const log = createLogger('sms-bridge')

const MAX_BODY_LENGTH = 2000

type IngestPayload = {
  from: string
  body: string
  timestamp?: string
}

function parsePayload(raw: unknown): IngestPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>

  const from = typeof obj.from === 'string' ? obj.from.trim() : ''
  const body = typeof obj.body === 'string' ? obj.body.trim() : ''

  if (!from || !body) return null

  const normalized = normalizePhone(from)
  if (!isValidE164(normalized)) return null

  return {
    from: normalized,
    body: body.slice(0, MAX_BODY_LENGTH),
    timestamp: typeof obj.timestamp === 'string' ? obj.timestamp : undefined,
  }
}

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status })
}

export async function POST(request: NextRequest) {
  try {
    // Auth: Bearer token
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (!token) {
      return json({ error: 'Missing authorization token' }, 401)
    }

    const tenantId = await resolveTokenTenant(token)
    if (!tenantId) {
      return json({ error: 'Invalid or disabled bridge token' }, 401)
    }

    // Parse body
    let raw: unknown
    try {
      raw = await request.json()
    } catch {
      return json({ error: 'Invalid JSON body' }, 400)
    }

    const payload = parsePayload(raw)
    if (!payload) {
      return json({ error: 'Missing or invalid "from" (E.164 phone) and "body" fields' }, 400)
    }

    // Blocklist check
    const blocked = await isBlocked(tenantId, payload.from)
    if (blocked) {
      await incrementBlocked(tenantId)
      return json({ status: 'blocked', reason: 'personal_contact' })
    }

    const timestamp = payload.timestamp || new Date().toISOString()
    const externalId = `bridge-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`

    // Ingest directly into communication pipeline (bypasses managed channel
    // resolution since bridge messages don't come from a Twilio number)
    const result = await ingestCommunicationEvent({
      tenantId,
      source: 'sms',
      externalId,
      timestamp,
      senderIdentity: payload.from,
      rawContent: payload.body,
      direction: 'inbound',
      ingestionSource: 'webhook',
      providerName: 'sms_bridge',
      managedChannelAddress: null,
      recipientAddress: `bridge:${tenantId}`,
    })

    // Write legacy message row for Hub display
    if (!result.deduped && result.threadId) {
      await logCommunicationMessageCompat({
        tenantId,
        threadId: result.threadId,
        direction: 'inbound',
        channel: 'sms',
        subject: null,
        body: payload.body,
        timestamp: result.timestamp || timestamp,
        clientId: result.resolvedClientId || null,
        linkedEntityType: result.linkedEntityType || null,
        linkedEntityId: result.linkedEntityId || null,
        externalId,
        externalThreadKey: null,
        recipientAddress: null,
        mailboxId: null,
      })
    }

    await incrementForwarded(tenantId)

    log.info('SMS bridge message ingested', {
      context: {
        tenantId,
        from: payload.from.slice(-4),
        threadId: result.threadId,
        clientResolved: !!result.resolvedClientId,
      },
    })

    return json({
      status: 'accepted',
      threadId: result.threadId || null,
      clientMatch: !!result.resolvedClientId,
    })
  } catch (err) {
    log.error('SMS bridge ingestion error', { error: err })
    return json({ error: 'Internal error' }, 500)
  }
}
