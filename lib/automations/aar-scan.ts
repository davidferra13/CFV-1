'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'

/**
 * Lightweight scan that checks how many completed events still need an
 * After-Action Review. Does not create any todos. Useful for dashboard
 * badges and notification counts.
 */
export async function scanPendingAARs(): Promise<{
  pendingAARCount: number
  events: Array<{ id: string; occasion: string | null; event_date: string }>
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Get completed events older than 24 hours
  const { data: events, error: eventsError } = await db
    .from('events')
    .select('id, occasion, event_date')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .lt('updated_at', cutoff)
    .eq('is_demo', false)
    .is('deleted_at', null)

  if (eventsError) {
    console.error('[AAR Scan] Failed to query events:', eventsError)
    throw new Error('Failed to scan for pending AARs')
  }

  if (!events || events.length === 0) {
    return { pendingAARCount: 0, events: [] }
  }

  // Filter out events that already have an AAR todo
  const pending: Array<{ id: string; occasion: string | null; event_date: string }> = []

  for (const event of events) {
    const { data: existing, error: todoError } = await db
      .from('chef_todos')
      .select('id')
      .eq('chef_id', user.entityId)
      .ilike('text', `%${event.id}%`)
      .limit(1)

    if (todoError) {
      console.error('[AAR Scan] Failed to check todo for event', event.id, todoError)
      continue
    }

    if (!existing || existing.length === 0) {
      pending.push({
        id: event.id,
        occasion: event.occasion,
        event_date: event.event_date,
      })
    }
  }

  return { pendingAARCount: pending.length, events: pending }
}
