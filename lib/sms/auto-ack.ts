// SMS Auto-Acknowledgment (fast path, <500ms target)
// Fire-and-forget from communication pipeline for inbound SMS.
// NOT a 'use server' file - internal helper only.

import { createServerClient } from '@/lib/db/server'
import { sendSms } from '@/lib/sms/send'

type AckResult = { sent: boolean; reason?: string }

/**
 * Send a quick SMS ack to the sender if auto-response is enabled
 * and we haven't already acked this thread.
 */
export async function triggerSmsAck(
  tenantId: string,
  threadId: string,
  senderPhone: string,
  clientName?: string
): Promise<AckResult> {
  try {
    const db: any = createServerClient()

    // 1. Check if tenant has auto-response enabled
    const { data: config } = await db
      .from('auto_response_config')
      .select('enabled')
      .eq('chef_id', tenantId)
      .maybeSingle()

    if (!config?.enabled) {
      return { sent: false, reason: 'auto_response_disabled' }
    }

    // 2. Dedup guard: check if ack already sent for this thread
    try {
      const { data: existing } = await db
        .from('sms_triage_metadata')
        .select('ack_sent_at')
        .eq('thread_id', threadId)
        .maybeSingle()

      if (existing?.ack_sent_at) {
        return { sent: false, reason: 'already_acked' }
      }
    } catch {
      // Table may not exist yet (migration pending) - proceed without dedup
    }

    // 3. Load chef business name for personalization
    const { data: chef } = await db
      .from('chefs')
      .select('business_name')
      .eq('id', tenantId)
      .single()

    const chefName = chef?.business_name || 'Your Chef'

    // 4. Build message (keep under 160 chars)
    const greeting = clientName ? `Hi ${clientName}! ` : ''
    const message = `${greeting}Got your message, I'll get back to you as soon as I can. - ${chefName}`

    // Truncate if over 160
    const body = message.length <= 160 ? message : message.slice(0, 157) + '...'

    // 5. Send
    const result = await sendSms(senderPhone, body)

    if (result !== 'sent') {
      return { sent: false, reason: `sms_${result}` }
    }

    // 6. Record ack in triage metadata
    try {
      // Upsert: create row if not exists, update if exists
      await db.from('sms_triage_metadata').upsert(
        {
          tenant_id: tenantId,
          thread_id: threadId,
          ack_sent_at: new Date().toISOString(),
          triage_state: 'ack_sent',
        },
        { onConflict: 'thread_id' }
      )
    } catch {
      // Table may not exist yet - ack was still sent, just not recorded
      console.warn('[sms-auto-ack] Could not update sms_triage_metadata (table may not exist)')
    }

    return { sent: true }
  } catch (err) {
    console.error('[sms-auto-ack] Unexpected error:', err)
    return { sent: false, reason: 'internal_error' }
  }
}
