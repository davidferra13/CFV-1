import type { NormalizedEmailEvent, NormalizedEmailEventKind } from './types'

type ResendWebhookPayload = {
  type?: string
  data?: {
    email_id?: string
    created_at?: string
    to?: string[]
  }
}

const RESEND_EVENT_KIND_MAP: Record<string, NormalizedEmailEventKind> = {
  'email.opened': 'opened',
  'email.clicked': 'clicked',
  'email.bounced': 'bounced',
  'email.spam_complaint': 'complained',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function readRecipients(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === 'string')
}

export async function verifyResendWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): Promise<boolean> {
  if (!signature) return false

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const parts = Object.fromEntries(
      signature.split(',').map((part) => part.split('=') as [string, string])
    )
    const timestamp = parts['t']
    const encodedSignature = parts['v1']

    if (!timestamp || !encodedSignature) return false

    const signedPayload = `${timestamp}.${payload}`
    const signatureBytes = Uint8Array.from(
      atob(encodedSignature.replace(/-/g, '+').replace(/_/g, '/')),
      (char) => char.charCodeAt(0)
    )

    return await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(signedPayload)
    )
  } catch {
    return false
  }
}

export function normalizeResendWebhookEvent(
  payload: string | ResendWebhookPayload
): NormalizedEmailEvent | null {
  const event = typeof payload === 'string' ? (JSON.parse(payload) as ResendWebhookPayload) : payload
  const eventType = typeof event?.type === 'string' ? event.type : ''
  const kind = RESEND_EVENT_KIND_MAP[eventType]

  if (!kind) return null

  const data = isRecord(event?.data) ? event.data : {}
  const providerMessageId = typeof data.email_id === 'string' ? data.email_id : ''
  if (!providerMessageId) return null

  const occurredAt = typeof data.created_at === 'string' ? data.created_at : new Date().toISOString()
  const recipients = readRecipients(data.to)
  const suppression =
    kind === 'bounced' ? 'hard_bounce' : kind === 'complained' ? 'spam_complaint' : 'none'

  return {
    provider: 'resend',
    kind,
    providerEventType: eventType,
    occurredAt,
    message: {
      provider: 'resend',
      providerMessageId,
      legacyResendMessageId: providerMessageId,
    },
    recipients,
    suppression,
    raw: event,
  }
}

export function mapNormalizedEventToCampaignRecipientField(
  event: NormalizedEmailEvent
): 'opened_at' | 'clicked_at' | 'bounced_at' | 'spam_at' | null {
  switch (event.kind) {
    case 'opened':
      return 'opened_at'
    case 'clicked':
      return 'clicked_at'
    case 'bounced':
      return 'bounced_at'
    case 'complained':
      return 'spam_at'
    default:
      return null
  }
}
