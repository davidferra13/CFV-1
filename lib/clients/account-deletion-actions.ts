'use server'

// Q57: Client account deletion (GDPR Article 17) + data export (Article 20)
// Soft-delete with 30-day grace period. Financial records retained 7 years.

import { requireClient } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { checkRateLimit } from '@/lib/rateLimit'

export interface ClientDeletionStatus {
  isPending: boolean
  requestedAt: string | null
  scheduledFor: string | null
  daysRemaining: number | null
}

export async function getClientDeletionStatus(): Promise<ClientDeletionStatus> {
  const user = await requireClient()
  const db: any = createServerClient()

  const { data: client } = await db
    .from('clients')
    .select('account_deletion_requested_at, account_deletion_scheduled_for')
    .eq('id', user.entityId)
    .single()

  if (!client?.account_deletion_requested_at) {
    return { isPending: false, requestedAt: null, scheduledFor: null, daysRemaining: null }
  }

  const scheduledFor = client.account_deletion_scheduled_for
  const daysRemaining = scheduledFor
    ? Math.max(
        0,
        Math.ceil((new Date(scheduledFor).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      )
    : null

  return {
    isPending: true,
    requestedAt: client.account_deletion_requested_at,
    scheduledFor,
    daysRemaining,
  }
}

export async function requestClientAccountDeletion(
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireClient()
  const db: any = createServerClient()

  await checkRateLimit(`client-deletion:${user.id}`, 3, 60 * 60 * 1000)

  // Check not already pending
  const { data: client } = await db
    .from('clients')
    .select('account_deletion_requested_at')
    .eq('id', user.entityId)
    .single()

  if (client?.account_deletion_requested_at) {
    return { success: false, error: 'Deletion already requested.' }
  }

  const now = new Date()
  const scheduledFor = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days

  const { error } = await db
    .from('clients')
    .update({
      account_deletion_requested_at: now.toISOString(),
      account_deletion_scheduled_for: scheduledFor.toISOString(),
      deletion_reason: reason?.trim().slice(0, 500) || null,
    })
    .eq('id', user.entityId)

  if (error) {
    console.error('[client-deletion] Failed:', error)
    return { success: false, error: 'Failed to process request.' }
  }

  return { success: true }
}

export async function cancelClientAccountDeletion(): Promise<{ success: boolean; error?: string }> {
  const user = await requireClient()
  const db: any = createServerClient()

  const { error } = await db
    .from('clients')
    .update({
      account_deletion_requested_at: null,
      account_deletion_scheduled_for: null,
      account_deletion_cancelled_at: new Date().toISOString(),
      deletion_reason: null,
    })
    .eq('id', user.entityId)

  if (error) {
    console.error('[client-deletion] Cancel failed:', error)
    return { success: false, error: 'Failed to cancel.' }
  }

  return { success: true }
}

/**
 * GDPR Article 20: Data portability export.
 * Returns all client-owned data as JSON.
 */
export async function exportClientData(): Promise<{ data: Record<string, any> }> {
  const user = await requireClient()
  const db: any = createServerClient()

  await checkRateLimit(`client-export:${user.id}`, 3, 60 * 60 * 1000)

  // Fetch client record
  const { data: client } = await db.from('clients').select('*').eq('id', user.entityId).single()

  // Fetch events
  const { data: events } = await db
    .from('events')
    .select(
      'id, occasion, event_date, guest_count, status, serve_time, location_address, location_city, location_state, created_at'
    )
    .eq('client_id', user.entityId)
    .order('event_date', { ascending: false })

  // Fetch inquiries
  const { data: inquiries } = await db
    .from('inquiries')
    .select(
      'id, channel, confirmed_occasion, confirmed_date, confirmed_guest_count, status, created_at'
    )
    .eq('client_id', user.entityId)
    .order('created_at', { ascending: false })

  // Fetch quotes
  const { data: quotes } = await db
    .from('quotes')
    .select('id, total_cents, status, version, created_at, expires_at')
    .eq('client_id', user.entityId)
    .order('created_at', { ascending: false })

  // Fetch conversations
  const { data: conversations } = await db
    .from('conversations')
    .select('id, created_at')
    .eq('client_id', user.entityId)

  const conversationIds = (conversations || []).map((c: any) => c.id)
  let messages: any[] = []
  if (conversationIds.length > 0) {
    const { data: msgs } = await db
      .from('messages')
      .select('id, sender_type, content, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: true })
    messages = msgs || []
  }

  // Strip internal fields
  const sanitized = { ...client }
  delete sanitized.tenant_id
  delete sanitized.portal_access_token
  delete sanitized.portal_access_token_hash
  delete sanitized.stripe_customer_id

  return {
    data: {
      exportedAt: new Date().toISOString(),
      profile: sanitized,
      events: events || [],
      inquiries: inquiries || [],
      quotes: quotes || [],
      messages,
    },
  }
}
