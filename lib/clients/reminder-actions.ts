'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ─── Types ──────────────────────────────────────────────────────────────────────

export type ImportantDate = {
  label: string
  date: string // ISO date string (YYYY-MM-DD)
}

export type ClientDateInfo = {
  clientId: string
  birthday: string | null
  anniversary: string | null
  importantDates: ImportantDate[]
}

export type UpcomingReminder = {
  clientId: string
  clientName: string
  type: 'birthday' | 'anniversary' | 'booking_anniversary' | 'custom'
  label: string
  date: string // next occurrence ISO date
  daysUntil: number
}

export type ReminderSummary = {
  thisWeek: number
  thisMonth: number
  reminders: UpcomingReminder[]
}

// ─── Validation ─────────────────────────────────────────────────────────────────

const ImportantDateSchema = z.object({
  label: z.string().min(1, 'Label required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
})

const UpdateClientDatesSchema = z.object({
  birthday: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  anniversary: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  importantDates: z.array(ImportantDateSchema).optional(),
})

// ─── Helpers ────────────────────────────────────────────────────────────────────

function nextOccurrence(dateStr: string, today: Date): Date {
  const d = new Date(dateStr)
  const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate())
  if (thisYear >= today) return thisYear
  return new Date(today.getFullYear() + 1, d.getMonth(), d.getDate())
}

function daysUntil(target: Date, today: Date): number {
  const diffMs = target.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

// ─── Actions ────────────────────────────────────────────────────────────────────

/**
 * Save birthday, anniversary, and custom important dates for a client.
 */
export async function updateClientDates(
  clientId: string,
  input: z.infer<typeof UpdateClientDatesSchema>
) {
  const user = await requireChef()
  const db: any = createServerClient()
  const validated = UpdateClientDatesSchema.parse(input)

  const updatePayload: Record<string, unknown> = {}
  if (validated.birthday !== undefined) updatePayload.birthday = validated.birthday
  if (validated.anniversary !== undefined) updatePayload.anniversary = validated.anniversary
  if (validated.importantDates !== undefined)
    updatePayload.important_dates = validated.importantDates

  const { error } = await db
    .from('clients')
    .update(updatePayload)
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to update client dates: ${error.message}`)

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/dashboard')
  return { success: true }
}

/**
 * Get a single client's date info (birthday, anniversary, important dates).
 */
export async function getClientDateInfo(clientId: string): Promise<ClientDateInfo> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('clients')
    .select('id, birthday, anniversary, important_dates')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error || !data) throw new Error('Client not found')

  return {
    clientId: data.id,
    birthday: data.birthday ?? null,
    anniversary: data.anniversary ?? null,
    importantDates: (data.important_dates as ImportantDate[]) ?? [],
  }
}

/**
 * Get all clients with birthdays, anniversaries, or custom dates in the next N days.
 * Combines birthday/anniversary DATE columns + important_dates JSONB + booking anniversaries.
 */
export async function getUpcomingReminders(daysAhead: number = 30): Promise<UpcomingReminder[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: clients } = await db
    .from('clients')
    .select('id, full_name, birthday, anniversary, important_dates')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)

  if (!clients || clients.length === 0) return []

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const results: UpcomingReminder[] = []

  for (const client of clients) {
    // Birthday
    if (client.birthday) {
      const next = nextOccurrence(client.birthday, today)
      const days = daysUntil(next, today)
      if (days <= daysAhead) {
        results.push({
          clientId: client.id,
          clientName: client.full_name,
          type: 'birthday',
          label: 'Birthday',
          date: next.toISOString().split('T')[0],
          daysUntil: days,
        })
      }
    }

    // Anniversary
    if (client.anniversary) {
      const next = nextOccurrence(client.anniversary, today)
      const days = daysUntil(next, today)
      if (days <= daysAhead) {
        results.push({
          clientId: client.id,
          clientName: client.full_name,
          type: 'anniversary',
          label: 'Anniversary',
          date: next.toISOString().split('T')[0],
          daysUntil: days,
        })
      }
    }

    // Custom important dates
    const importantDates = (client.important_dates as ImportantDate[]) ?? []
    for (const id of importantDates) {
      if (!id.date || !id.label) continue
      try {
        const next = nextOccurrence(id.date, today)
        const days = daysUntil(next, today)
        if (days <= daysAhead) {
          results.push({
            clientId: client.id,
            clientName: client.full_name,
            type: 'custom',
            label: id.label,
            date: next.toISOString().split('T')[0],
            daysUntil: days,
          })
        }
      } catch {
        // Skip malformed dates
      }
    }
  }

  results.sort((a, b) => a.daysUntil - b.daysUntil)
  return results
}

/**
 * Auto-detect booking anniversaries: clients whose first event was 1+ years ago.
 * Returns clients approaching the anniversary of their first booking.
 */
export async function detectAnniversaries(daysAhead: number = 30): Promise<UpcomingReminder[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get earliest event per client
  const { data: events } = await db
    .from('events')
    .select('client_id, event_date, clients!inner(full_name)')
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: true })

  if (!events || events.length === 0) return []

  // Find first event date per client
  const firstEvents = new Map<string, { date: string; name: string }>()
  for (const e of events) {
    if (!e.client_id || !e.event_date) continue
    if (!firstEvents.has(e.client_id)) {
      firstEvents.set(e.client_id, {
        date: e.event_date,
        name: (e.clients as any)?.full_name ?? 'Unknown',
      })
    }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const oneYearAgo = new Date(today)
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const results: UpcomingReminder[] = []

  for (const [clientId, { date, name }] of firstEvents) {
    const firstDate = new Date(date)
    // Only count if first event was at least 1 year ago
    if (firstDate > oneYearAgo) continue

    const next = nextOccurrence(date, today)
    const days = daysUntil(next, today)
    if (days <= daysAhead) {
      const yearsAgo = today.getFullYear() - firstDate.getFullYear()
      results.push({
        clientId,
        clientName: name,
        type: 'booking_anniversary',
        label: `${yearsAgo}-year booking anniversary`,
        date: next.toISOString().split('T')[0],
        daysUntil: days,
      })
    }
  }

  results.sort((a, b) => a.daysUntil - b.daysUntil)
  return results
}

/**
 * Dashboard widget data: count of reminders this week, this month, plus the list.
 */
export async function getReminderSummary(): Promise<ReminderSummary> {
  const [reminders, bookingAnniversaries] = await Promise.all([
    getUpcomingReminders(30),
    detectAnniversaries(30),
  ])

  const allReminders = [...reminders, ...bookingAnniversaries].sort(
    (a, b) => a.daysUntil - b.daysUntil
  )

  // Deduplicate by clientId + type (keep lowest daysUntil)
  const seen = new Set<string>()
  const deduped: UpcomingReminder[] = []
  for (const r of allReminders) {
    const key = `${r.clientId}-${r.type}-${r.label}`
    if (!seen.has(key)) {
      seen.add(key)
      deduped.push(r)
    }
  }

  const thisWeek = deduped.filter((r) => r.daysUntil <= 7).length
  const thisMonth = deduped.length

  return { thisWeek, thisMonth, reminders: deduped }
}
