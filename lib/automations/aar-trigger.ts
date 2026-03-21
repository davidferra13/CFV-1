'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

/**
 * Checks for completed events older than 24 hours that have no AAR reminder
 * todo yet. Creates a todo for each one so the chef remembers to complete
 * their After-Action Review.
 *
 * Idempotent: safe to call multiple times. Duplicate todos are prevented by
 * checking for existing todos whose text contains the event ID.
 */
export async function triggerAARReminders(): Promise<{
  created: number
  skipped: number
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // 1. Find completed events older than 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id, occasion, event_date')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .lt('updated_at', cutoff)
    .eq('is_demo', false)
    .is('deleted_at', null)

  if (eventsError) {
    console.error('[AAR Trigger] Failed to query events:', eventsError)
    throw new Error('Failed to query completed events')
  }

  if (!events || events.length === 0) {
    return { created: 0, skipped: 0 }
  }

  // 2. Check existing todos for each event to avoid duplicates
  let created = 0
  let skipped = 0

  for (const event of events) {
    const { data: existing, error: todoError } = await supabase
      .from('chef_todos')
      .select('id')
      .eq('chef_id', user.entityId)
      .ilike('text', `%${event.id}%`)
      .limit(1)

    if (todoError) {
      console.error('[AAR Trigger] Failed to check existing todo for event', event.id, todoError)
      skipped++
      continue
    }

    if (existing && existing.length > 0) {
      skipped++
      continue
    }

    // 3. Create the reminder todo
    const occasion = event.occasion || 'Untitled event'
    const dateStr = event.event_date
      ? new Date(event.event_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : 'unknown date'

    const todoText = `Complete AAR for ${occasion} on ${dateStr} → /events/${event.id}/aar`

    const { error: insertError } = await supabase.from('chef_todos').insert({
      chef_id: user.entityId,
      text: todoText,
      completed: false,
      created_by: 'system',
      sort_order: 0,
    })

    if (insertError) {
      console.error('[AAR Trigger] Failed to create todo for event', event.id, insertError)
      skipped++
      continue
    }

    created++
  }

  return { created, skipped }
}
