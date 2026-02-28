'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { z } from 'zod'

// ---------------------------------------------------------------------------
// Public actions (no auth — guests posting from share page)
// ---------------------------------------------------------------------------

const PostMessageSchema = z.object({
  shareToken: z.string().min(1),
  guestToken: z.string().optional(),
  guestName: z.string().min(1, 'Name is required').max(100),
  message: z.string().min(1, 'Message is required').max(500),
  emoji: z.string().max(10).optional(),
})

/**
 * Post a message to the event excitement wall.
 * Public — no auth required. Uses admin client.
 */
export async function postGuestMessage(input: {
  shareToken: string
  guestToken?: string
  guestName: string
  message: string
  emoji?: string
}) {
  const validated = PostMessageSchema.parse(input)
  const supabase = createServerClient({ admin: true })

  // Resolve share token → event + tenant
  const { data: share } = await supabase
    .from('event_shares')
    .select('event_id, tenant_id')
    .eq('token', validated.shareToken)
    .eq('is_active', true)
    .single()

  if (!share) {
    throw new Error('Invalid or expired share link')
  }

  // If guest token provided, link to guest record
  let guestId: string | null = null
  if (validated.guestToken) {
    const { data: guest } = await supabase
      .from('event_guests')
      .select('id')
      .eq('guest_token', validated.guestToken)
      .eq('event_id', share.event_id)
      .single()

    if (guest) {
      guestId = guest.id
    }
  }

  // Rate limit: max 10 messages per guest per event (by name, loose limit)
  const { data: existing } = await supabase
    .from('guest_messages')
    .select('id', { count: 'exact' })
    .eq('event_id', share.event_id)
    .eq('guest_name', validated.guestName.trim())

  if (existing && existing.length >= 10) {
    throw new Error('Message limit reached for this event')
  }

  const { error } = await supabase.from('guest_messages').insert({
    tenant_id: share.tenant_id,
    event_id: share.event_id,
    guest_id: guestId,
    guest_name: validated.guestName.trim(),
    message: validated.message.trim(),
    emoji: validated.emoji || null,
    is_visible: true,
    is_pinned: false,
  })

  if (error) {
    console.error('[postGuestMessage] Insert error:', error)
    throw new Error('Failed to post message')
  }

  return { success: true }
}

/**
 * Get visible messages for an event (public — share page).
 * Only returns visible (non-hidden) messages.
 */
export async function getEventMessages(shareToken: string) {
  const supabase = createServerClient({ admin: true })

  // Resolve share token → event
  const { data: share } = await supabase
    .from('event_shares')
    .select('event_id')
    .eq('token', shareToken)
    .eq('is_active', true)
    .single()

  if (!share) return []

  const { data, error } = await supabase
    .from('guest_messages')
    .select('id, guest_name, message, emoji, is_pinned, created_at')
    .eq('event_id', share.event_id)
    .eq('is_visible', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[getEventMessages] Query error:', error)
    return []
  }

  return data ?? []
}

// ---------------------------------------------------------------------------
// Chef actions (auth required)
// ---------------------------------------------------------------------------

/**
 * Get ALL messages for an event (including hidden). Chef only.
 */
export async function getEventMessagesForChef(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('guest_messages')
    .select('id, guest_name, message, emoji, is_visible, is_pinned, guest_id, created_at')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getEventMessagesForChef] Query error:', error)
    return []
  }

  return data ?? []
}

/**
 * Toggle message visibility (hide/show). Chef only.
 */
export async function toggleMessageVisibility(messageId: string, visible: boolean) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('guest_messages')
    .update({ is_visible: visible })
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[toggleMessageVisibility] Error:', error)
    throw new Error('Failed to update message')
  }
}

/**
 * Toggle message pin status. Chef only.
 */
export async function toggleMessagePin(messageId: string, pinned: boolean) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('guest_messages')
    .update({ is_pinned: pinned })
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[toggleMessagePin] Error:', error)
    throw new Error('Failed to update pin status')
  }
}

/**
 * Delete a guest message permanently. Chef only.
 */
export async function deleteGuestMessage(messageId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('guest_messages')
    .delete()
    .eq('id', messageId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[deleteGuestMessage] Error:', error)
    throw new Error('Failed to delete message')
  }
}

/**
 * Get excitement wall stats for an event. Chef only.
 */
export async function getExcitementWallStats(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('guest_messages')
    .select('id, is_visible')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)

  if (!data) return { total: 0, visible: 0, hidden: 0 }

  const messages = data as { id: string; is_visible: boolean }[]
  return {
    total: messages.length,
    visible: messages.filter((m) => m.is_visible).length,
    hidden: messages.filter((m) => !m.is_visible).length,
  }
}
