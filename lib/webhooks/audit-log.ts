'use server'

// Webhook Event Audit Log Utility
// Call logWebhookEvent() inside each webhook handler to record that
// the webhook fired and what the outcome was.
//
// Fire-and-forget: this function NEVER throws. Logging failure must
// never cause a webhook handler to fail - a missed audit log entry
// is far less bad than a missed payment.
//
// Full payloads are NOT stored. Only metadata:
//   - provider, event_type, provider_event_id
//   - status (received/processed/failed/skipped)
//   - result summary
//   - timestamp (auto-set by DB)

import { createServerClient } from '@/lib/db/server'

type WebhookEventStatus = 'received' | 'processed' | 'failed' | 'skipped'

export async function logWebhookEvent({
  provider,
  eventType,
  providerEventId,
  status = 'processed',
  result,
  errorText,
  payloadSizeBytes,
}: {
  provider: string
  eventType: string
  providerEventId?: string
  status?: WebhookEventStatus
  result?: Record<string, unknown>
  errorText?: string
  payloadSizeBytes?: number
}): Promise<void> {
  try {
    const db = createServerClient({ admin: true })
    const { error } = await db.from('webhook_events').insert({
      provider,
      event_type: eventType,
      provider_event_id: providerEventId ?? null,
      status,
      result: (result ?? null) as unknown as undefined,
      error_text: errorText ?? null,
      payload_size_bytes: payloadSizeBytes ?? null,
    })
    if (error) {
      console.error('[WebhookAuditLog] Failed to log webhook event:', error)
    }
  } catch (err) {
    console.error('[WebhookAuditLog] Unexpected error logging webhook event:', err)
  }
}
