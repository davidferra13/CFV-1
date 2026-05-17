'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  CloseoutChecklist,
  CloseoutItem,
  CloseoutItemStatus,
  CloseoutReminder,
} from '@/lib/events/closeout-types'

// ── Checklist Item Definitions ─────────────────────────────────────────────

const CHECKLIST_DEFINITIONS: Omit<CloseoutItem, 'status' | 'completedAt'>[] = [
  {
    key: 'invoice_sent',
    label: 'Invoice sent',
    description: 'Final invoice sent to client after event',
    required: true,
    category: 'financial',
  },
  {
    key: 'payment_collected',
    label: 'Payment collected',
    description: 'Full payment received and confirmed',
    required: true,
    category: 'financial',
  },
  {
    key: 'final_cost_reconciled',
    label: 'Final cost reconciled',
    description: 'Actual expenses reconciled against quoted price',
    required: true,
    category: 'financial',
  },
  {
    key: 'thank_you_sent',
    label: 'Thank-you sent',
    description: 'Post-event thank-you message sent to client',
    required: false,
    category: 'communication',
  },
  {
    key: 'review_requested',
    label: 'Review requested',
    description: 'Asked client for a review or testimonial',
    required: false,
    category: 'followup',
  },
  {
    key: 'feedback_collected',
    label: 'Feedback collected',
    description: 'Client feedback or survey response received',
    required: false,
    category: 'followup',
  },
  {
    key: 'photos_uploaded',
    label: 'Photos uploaded',
    description: 'Event photos uploaded and tagged',
    required: false,
    category: 'documentation',
  },
  {
    key: 'client_notes_updated',
    label: 'Client notes updated',
    description: 'Post-event notes recorded (preferences, allergies, special requests)',
    required: false,
    category: 'documentation',
  },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildChecklist(
  eventId: string,
  itemOverrides: Record<string, { status: CloseoutItemStatus; completedAt: string | null }>
): CloseoutChecklist {
  const items: CloseoutItem[] = CHECKLIST_DEFINITIONS.map((def) => {
    const override = itemOverrides[def.key]
    return {
      ...def,
      status: override?.status ?? 'pending',
      completedAt: override?.completedAt ?? null,
    }
  })

  const total = items.length
  const done = items.filter((i) => i.status === 'completed' || i.status === 'skipped').length
  const overallPercent = total > 0 ? Math.round((done / total) * 100) : 0

  const blockers: string[] = []
  for (const item of items) {
    if (item.required && item.status !== 'completed') {
      blockers.push(item.label)
    }
  }

  return {
    eventId,
    items,
    overallPercent,
    canFinalize: blockers.length === 0,
    blockers,
  }
}

// ── 1. getCloseoutChecklist ────────────────────────────────────────────────

export async function getCloseoutChecklist(eventId: string): Promise<{
  success: boolean
  checklist?: CloseoutChecklist
  error?: string
}> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    // Verify event belongs to tenant
    const { data: event, error: eventErr } = await db
      .from('events')
      .select('id')
      .eq('id', eventId)
      .eq('tenant_id', chef.id)
      .single()

    if (eventErr || !event) {
      return { success: false, error: 'Event not found' }
    }

    // Fetch existing closeout item records
    const { data: rows } = await db
      .from('closeout_items')
      .select('item_key, status, completed_at')
      .eq('event_id', eventId)
      .eq('tenant_id', chef.id)

    const overrides: Record<string, { status: CloseoutItemStatus; completedAt: string | null }> = {}
    if (rows) {
      for (const row of rows) {
        overrides[row.item_key] = {
          status: row.status as CloseoutItemStatus,
          completedAt: row.completed_at,
        }
      }
    }

    const checklist = buildChecklist(eventId, overrides)
    return { success: true, checklist }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── 2. completeCloseoutItem ────────────────────────────────────────────────

export async function completeCloseoutItem(
  eventId: string,
  itemKey: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const validKeys = CHECKLIST_DEFINITIONS.map((d) => d.key)
    if (!validKeys.includes(itemKey)) {
      return { success: false, error: `Invalid item key: ${itemKey}` }
    }

    const now = new Date().toISOString()

    const { error } = await db.from('closeout_items').upsert(
      {
        tenant_id: chef.id,
        event_id: eventId,
        item_key: itemKey,
        status: 'completed',
        completed_at: now,
      },
      { onConflict: 'tenant_id,event_id,item_key' }
    )

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── 3. skipCloseoutItem ────────────────────────────────────────────────────

export async function skipCloseoutItem(
  eventId: string,
  itemKey: string,
  reason: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const validKeys = CHECKLIST_DEFINITIONS.map((d) => d.key)
    if (!validKeys.includes(itemKey)) {
      return { success: false, error: `Invalid item key: ${itemKey}` }
    }

    const { error } = await db.from('closeout_items').upsert(
      {
        tenant_id: chef.id,
        event_id: eventId,
        item_key: itemKey,
        status: 'skipped',
        skipped_reason: reason,
        completed_at: null,
      },
      { onConflict: 'tenant_id,event_id,item_key' }
    )

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── 4. getOverdueCloseouts ─────────────────────────────────────────────────

export async function getOverdueCloseouts(daysThreshold: number = 7): Promise<{
  success: boolean
  overdue?: Array<{
    eventId: string
    eventTitle: string
    eventDate: string
    daysOverdue: number
    completionPercent: number
    blockers: string[]
  }>
  error?: string
}> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - daysThreshold)

    // Find past events that may have incomplete closeouts
    const { data: pastEvents, error: evErr } = await db
      .from('events')
      .select('id, title, event_date')
      .eq('tenant_id', chef.id)
      .lt('event_date', new Date().toISOString())
      .order('event_date', { ascending: false })
      .limit(100)

    if (evErr) {
      return { success: false, error: evErr.message }
    }

    if (!pastEvents || pastEvents.length === 0) {
      return { success: true, overdue: [] }
    }

    const eventIds = pastEvents.map((e: any) => e.id)

    // Fetch all closeout items for these events
    const { data: allItems } = await db
      .from('closeout_items')
      .select('event_id, item_key, status, completed_at')
      .eq('tenant_id', chef.id)
      .in('event_id', eventIds)

    const itemsByEvent: Record<
      string,
      Record<string, { status: CloseoutItemStatus; completedAt: string | null }>
    > = {}
    if (allItems) {
      for (const row of allItems) {
        if (!itemsByEvent[row.event_id]) itemsByEvent[row.event_id] = {}
        itemsByEvent[row.event_id][row.item_key] = {
          status: row.status as CloseoutItemStatus,
          completedAt: row.completed_at,
        }
      }
    }

    const overdue: Array<{
      eventId: string
      eventTitle: string
      eventDate: string
      daysOverdue: number
      completionPercent: number
      blockers: string[]
    }> = []

    const now = Date.now()
    for (const ev of pastEvents) {
      const checklist = buildChecklist(ev.id, itemsByEvent[ev.id] ?? {})
      if ((checklist.overallPercent ?? 0) >= 100) continue

      const evDate = new Date(ev.event_date).getTime()
      const daysOverdue = Math.floor((now - evDate) / (1000 * 60 * 60 * 24))

      if (daysOverdue >= daysThreshold) {
        overdue.push({
          eventId: ev.id,
          eventTitle: ev.title ?? 'Untitled Event',
          eventDate: ev.event_date,
          daysOverdue,
          completionPercent: checklist.overallPercent ?? 0,
          blockers: checklist.blockers ?? [],
        })
      }
    }

    return { success: true, overdue }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── 5. scheduleCloseoutReminder ────────────────────────────────────────────

export async function scheduleCloseoutReminder(
  eventId: string,
  itemKey: string,
  reminderAt: string
): Promise<{
  success: boolean
  reminder?: CloseoutReminder
  error?: string
}> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    const validKeys = CHECKLIST_DEFINITIONS.map((d) => d.key)
    if (!validKeys.includes(itemKey)) {
      return { success: false, error: `Invalid item key: ${itemKey}` }
    }

    const parsed = new Date(reminderAt)
    if (isNaN(parsed.getTime())) {
      return { success: false, error: 'Invalid reminderAt date' }
    }

    const { data, error } = await db
      .from('closeout_reminders')
      .insert({
        tenant_id: chef.id,
        event_id: eventId,
        item_key: itemKey,
        reminder_at: parsed.toISOString(),
        sent: false,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    const reminder: CloseoutReminder = {
      id: data.id,
      tenantId: data.tenant_id,
      eventId: data.event_id,
      itemKey: data.item_key,
      reminderAt: data.reminder_at,
      sent: data.sent,
    }

    return { success: true, reminder }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ── 6. getCloseoutSummary ──────────────────────────────────────────────────

export async function getCloseoutSummary(): Promise<{
  success: boolean
  summary?: {
    totalEvents: number
    fullyComplete: number
    avgCompletionPercent: number
    commonSkippedItems: Array<{ itemKey: string; label: string; count: number }>
    commonBlockers: Array<{ itemKey: string; label: string; count: number }>
  }
  error?: string
}> {
  try {
    const chef = await requireChef()
    const db: any = createServerClient()

    // Get all past events
    const { data: pastEvents, error: evErr } = await db
      .from('events')
      .select('id')
      .eq('tenant_id', chef.id)
      .lt('event_date', new Date().toISOString())

    if (evErr) {
      return { success: false, error: evErr.message }
    }

    if (!pastEvents || pastEvents.length === 0) {
      return {
        success: true,
        summary: {
          totalEvents: 0,
          fullyComplete: 0,
          avgCompletionPercent: 0,
          commonSkippedItems: [],
          commonBlockers: [],
        },
      }
    }

    const eventIds = pastEvents.map((e: any) => e.id)

    // Fetch all closeout items
    const { data: allItems } = await db
      .from('closeout_items')
      .select('event_id, item_key, status')
      .eq('tenant_id', chef.id)
      .in('event_id', eventIds)

    const itemsByEvent: Record<
      string,
      Record<string, { status: CloseoutItemStatus; completedAt: string | null }>
    > = {}
    if (allItems) {
      for (const row of allItems) {
        if (!itemsByEvent[row.event_id]) itemsByEvent[row.event_id] = {}
        itemsByEvent[row.event_id][row.item_key] = {
          status: row.status as CloseoutItemStatus,
          completedAt: null,
        }
      }
    }

    let fullyComplete = 0
    let totalPercent = 0
    const skippedCounts: Record<string, number> = {}
    const blockerCounts: Record<string, number> = {}

    for (const ev of pastEvents) {
      const checklist = buildChecklist(ev.id, itemsByEvent[ev.id] ?? {})
      totalPercent += checklist.overallPercent ?? 0
      if ((checklist.overallPercent ?? 0) >= 100) fullyComplete++

      for (const item of checklist.items) {
        if (item.status === 'skipped') {
          skippedCounts[item.key] = (skippedCounts[item.key] ?? 0) + 1
        }
        if (item.required && item.status === 'pending') {
          blockerCounts[item.key] = (blockerCounts[item.key] ?? 0) + 1
        }
      }
    }

    const labelMap: Record<string, string> = {}
    for (const def of CHECKLIST_DEFINITIONS) {
      labelMap[def.key] = def.label
    }

    const commonSkippedItems = Object.entries(skippedCounts)
      .map(([itemKey, count]) => ({ itemKey, label: labelMap[itemKey] ?? itemKey, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    const commonBlockers = Object.entries(blockerCounts)
      .map(([itemKey, count]) => ({ itemKey, label: labelMap[itemKey] ?? itemKey, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return {
      success: true,
      summary: {
        totalEvents: pastEvents.length,
        fullyComplete,
        avgCompletionPercent: Math.round(totalPercent / pastEvents.length),
        commonSkippedItems,
        commonBlockers,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
