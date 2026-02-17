// System Messages -- Auto-posted into chat conversations on key events
// Uses admin client (service role) because webhooks may trigger these

'use server'

import { createServerClient } from '@/lib/supabase/server'

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  proposed: 'Proposal Sent',
  accepted: 'Accepted',
  paid: 'Payment Received',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

/**
 * Post a system message when an event transitions status.
 * Only posts if a conversation exists for this event — no-op otherwise.
 * Non-blocking: callers should wrap in try/catch.
 */
export async function postEventSystemMessage(
  eventId: string,
  fromStatus: string,
  toStatus: string
) {
  const supabase = createServerClient({ admin: true })

  // Find the conversation linked to this event
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('event_id', eventId)
    .eq('context_type', 'event')
    .limit(1)
    .single()

  if (!conversation) return // No conversation for this event — skip silently

  const body = `Event status changed to ${STATUS_LABELS[toStatus] || toStatus}`

  const { error } = await supabase.from('chat_messages').insert({
    conversation_id: conversation.id,
    sender_id: '00000000-0000-0000-0000-000000000000', // System sender placeholder
    message_type: 'system' as const,
    body,
    system_event_type: 'event_status_changed',
    system_metadata: {
      event_id: eventId,
      from_status: fromStatus,
      to_status: toStatus,
    } as Record<string, string>,
  })

  if (error) {
    console.error('[postEventSystemMessage] Error:', error)
    // Don't throw — this is a side effect, not critical path
  }
}

/**
 * Post a generic system message into a conversation.
 * Used for other automated notifications (quote sent, payment received, etc.)
 */
export async function postSystemMessage(input: {
  conversation_id: string
  system_event_type: string
  body: string
  metadata?: Record<string, string | number | boolean | null>
}) {
  const supabase = createServerClient({ admin: true })

  const { error } = await supabase.from('chat_messages').insert({
    conversation_id: input.conversation_id,
    sender_id: '00000000-0000-0000-0000-000000000000',
    message_type: 'system' as const,
    body: input.body,
    system_event_type: input.system_event_type,
    system_metadata: (input.metadata as Record<string, string | number | boolean | null>) ?? null,
  })

  if (error) {
    console.error('[postSystemMessage] Error:', error)
  }
}
