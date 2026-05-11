// Quick Log Server Actions
// Parse free-text input and route to the correct domain (expense, note, task)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { parseQuickLog, type QuickLogEntry } from './quick-log'
import { todayLocalDateString } from '@/lib/utils/format'

export type QuickLogResult = {
  success: boolean
  type: QuickLogEntry['type']
  error?: string
}

/**
 * Submit a quick log entry. Parses the text and routes to the correct domain.
 * - Expense: creates an expense record
 * - Note: creates a client note linked to the event (or a general note)
 * - Task: creates a task, optionally linked to an event
 */
export async function submitQuickLog(
  text: string,
  eventId?: string
): Promise<QuickLogResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  if (!text.trim()) {
    return { success: false, type: 'note', error: 'Empty input' }
  }

  const entry = parseQuickLog(text)
  const db: any = createServerClient()

  try {
    switch (entry.type) {
      case 'expense': {
        const today = todayLocalDateString()
        const { error } = await db
          .from('expenses')
          .insert({
            tenant_id: tenantId,
            created_by: user.id,
            amount_cents: entry.amount_cents ?? 0,
            description: entry.description,
            vendor: entry.vendor ?? null,
            category: 'other',
            payment_method: 'card',
            expense_date: today,
            is_business: true,
            is_reimbursable: false,
            event_id: eventId ?? null,
          })
          .select()
          .single()

        if (error) {
          console.error('[submitQuickLog] expense error:', error)
          return { success: false, type: 'expense', error: 'Failed to log expense' }
        }

        // Log to quick_log_history for recent display
        await logQuickLogHistory(db, tenantId, user.id, entry, eventId)
        revalidatePath('/expenses')
        if (eventId) revalidatePath(`/events/${eventId}`)
        return { success: true, type: 'expense' }
      }

      case 'note': {
        // If we have an event, find the client for that event and add a client note
        if (eventId) {
          const { data: event } = await db
            .from('events')
            .select('client_id')
            .eq('id', eventId)
            .eq('tenant_id', tenantId)
            .single()

          if (event?.client_id) {
            const { error } = await db
              .from('client_notes')
              .insert({
                tenant_id: tenantId,
                client_id: event.client_id,
                event_id: eventId,
                note_text: entry.description,
                category: 'general',
                pinned: false,
                source: 'quick_log',
              })
              .select()
              .single()

            if (error) {
              console.error('[submitQuickLog] note error:', error)
              return { success: false, type: 'note', error: 'Failed to save note' }
            }
          }
        }

        // Always log to quick_log_history
        await logQuickLogHistory(db, tenantId, user.id, entry, eventId)
        if (eventId) revalidatePath(`/events/${eventId}`)
        return { success: true, type: 'note' }
      }

      case 'task': {
        const today = todayLocalDateString()
        const { error } = await db
          .from('tasks')
          .insert({
            chef_id: tenantId,
            title: entry.description,
            description: null,
            assigned_to: null,
            station_id: null,
            due_date: today,
            due_time: null,
            priority: 'medium',
            status: 'pending',
            notes: null,
            event_id: eventId ?? null,
          })
          .select()
          .single()

        if (error) {
          console.error('[submitQuickLog] task error:', error)
          return { success: false, type: 'task', error: 'Failed to create task' }
        }

        await logQuickLogHistory(db, tenantId, user.id, entry, eventId)
        revalidatePath('/tasks')
        if (eventId) revalidatePath(`/events/${eventId}`)
        return { success: true, type: 'task' }
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[submitQuickLog] error:', msg)
    return { success: false, type: entry.type, error: msg }
  }
}

/**
 * Get recent quick log entries for display.
 * Uses the activity_log table filtered by quick_log source.
 */
export async function getRecentQuickLogs(limit = 10) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('chef_activity_log')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('source', 'quick_log')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    // Table might not exist; return empty gracefully
    return []
  }

  return data ?? []
}

/**
 * Get the next upcoming event for the current chef.
 * Used as default event selector in quick log.
 */
export async function getNextUpcomingEvent() {
  const user = await requireChef()
  const db: any = createServerClient()
  const today = todayLocalDateString()

  const { data } = await db
    .from('events')
    .select('id, occasion, event_date, serve_time, clients(full_name)')
    .eq('tenant_id', user.tenantId!)
    .gte('event_date', today)
    .not('status', 'in', '("cancelled","completed")')
    .order('event_date', { ascending: true })
    .limit(5)

  return (data ?? []).map((e: any) => ({
    id: e.id,
    label: `${e.clients?.full_name ?? 'Event'} - ${e.occasion ?? e.event_date}`,
    event_date: e.event_date,
  }))
}

// Internal helper: log to chef_activity_log for recent display
async function logQuickLogHistory(
  db: any,
  tenantId: string,
  actorId: string,
  entry: QuickLogEntry,
  eventId?: string
) {
  try {
    await db.from('chef_activity_log').insert({
      tenant_id: tenantId,
      actor_id: actorId,
      action: `quick_log_${entry.type}`,
      source: 'quick_log',
      summary: entry.raw.slice(0, 200),
      entity_type: entry.type,
      entity_id: eventId ?? null,
      metadata: {
        type: entry.type,
        amount_cents: entry.amount_cents,
        vendor: entry.vendor,
        description: entry.description,
      },
    })
  } catch {
    // Non-blocking; table may not have all columns
  }
}
