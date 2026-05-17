import { createServerClient } from '@/lib/db/server'

/**
 * Maps communication_source values to contact_method enum values.
 * Only direct channels count; platform sources (takeachef, yhangry, etc.)
 * are excluded because they don't indicate a personal preference.
 */
const SOURCE_TO_CONTACT_METHOD: Record<string, string> = {
  email: 'email',
  sms: 'text',
  whatsapp: 'text',
  phone: 'phone',
  instagram: 'instagram',
}

/**
 * Minimum inbound responses required before writing a preference.
 * Prevents a single message from setting the preference.
 */
const MIN_RESPONSES = 3

/**
 * How far back to look when tallying channel usage (90 days).
 */
const LOOKBACK_DAYS = 90

/**
 * Passive Channel Preference Writer.
 *
 * Tallies which direct channel (email, text, phone, instagram) a client
 * responds on most frequently, then updates clients.preferred_contact_method
 * with the winner. Only updates when the winner differs from the current value.
 *
 * Non-blocking: failures are logged but never propagated.
 */
export async function updateClientChannelPreference(
  tenantId: string,
  clientId: string
): Promise<void> {
  try {
    const db: any = createServerClient({ admin: true })

    const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

    // Fetch recent inbound communication events for this client
    const { data: events } = await db
      .from('communication_events')
      .select('source')
      .eq('tenant_id', tenantId)
      .eq('resolved_client_id', clientId)
      .eq('direction', 'inbound')
      .gte('timestamp', cutoff)
      .order('timestamp', { ascending: false })
      .limit(200)

    if (!events || events.length === 0) return

    // Tally by contact method
    const tally: Record<string, number> = {}
    for (const event of events) {
      const method = SOURCE_TO_CONTACT_METHOD[event.source]
      if (method) {
        tally[method] = (tally[method] || 0) + 1
      }
    }

    // Find the winner
    let winner: string | null = null
    let maxCount = 0
    for (const [method, count] of Object.entries(tally)) {
      if (count > maxCount) {
        maxCount = count
        winner = method
      }
    }

    // Only update if we have enough data and a clear winner
    if (!winner || maxCount < MIN_RESPONSES) return

    // Check current value to avoid unnecessary writes
    const { data: client } = await db
      .from('clients')
      .select('preferred_contact_method')
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
      .single()

    if (!client) return
    if (client.preferred_contact_method === winner) return

    // Update the preference
    await db
      .from('clients')
      .update({ preferred_contact_method: winner })
      .eq('id', clientId)
      .eq('tenant_id', tenantId)
  } catch (err) {
    // Non-blocking: log but never propagate
    console.error(
      `[channel-preference-writer] Failed for client ${clientId}:`,
      err instanceof Error ? err.message : err
    )
  }
}
