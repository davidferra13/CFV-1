'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ClientPassport, ClientNote, SpecialDate, ClientInsight } from './passport-types'

// ---------------------------------------------------------------------------
// Internal DB helper (raw SQL via postgres.js)
// ---------------------------------------------------------------------------

type QueryResult<T = Record<string, unknown>> = {
  rows: T[]
}

const db = {
  async query<T = Record<string, unknown>>(
    sql: string,
    params: readonly unknown[] = []
  ): Promise<QueryResult<T>> {
    const rows = await pgClient.unsafe(sql, params as any[])
    return { rows: rows as unknown as T[] }
  },
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const PassportUpdateSchema = z.object({
  communication_mode: z.enum(['direct', 'delegate_only', 'delegate_preferred']).optional(),
  preferred_contact_method: z.enum(['email', 'sms', 'phone', 'circle']).nullable().optional(),
  chef_autonomy_level: z.enum(['full', 'high', 'moderate', 'low']).optional(),
  auto_approve_under_cents: z.number().int().min(0).nullable().optional(),
  max_interaction_rounds: z.number().int().min(1).max(20).nullable().optional(),
  standing_instructions: z.string().max(2000).nullable().optional(),
  default_guest_count: z.number().int().min(1).max(500).nullable().optional(),
  budget_range_min_cents: z.number().int().min(0).nullable().optional(),
  budget_range_max_cents: z.number().int().min(0).nullable().optional(),
  service_style: z
    .enum(['formal_plated', 'family_style', 'buffet', 'cocktail', 'tasting_menu', 'no_preference'])
    .nullable()
    .optional(),
  default_locations: z
    .array(
      z.object({
        label: z.string().max(100),
        address: z.string().max(300).optional(),
        city: z.string().max(100),
        state: z.string().max(50),
      })
    )
    .max(10)
    .optional(),
  delegate_name: z.string().max(200).nullable().optional(),
  delegate_email: z.string().email().nullable().optional(),
  delegate_phone: z.string().max(30).nullable().optional(),
})

const SpecialDateInputSchema = z.object({
  label: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  recurrence: z.enum(['annual', 'once']).default('annual'),
  notes: z.string().max(1000).nullable().optional(),
})

// ---------------------------------------------------------------------------
// getClientPassport - Complete client profile with passport data
// ---------------------------------------------------------------------------

export async function getClientPassport(clientId: string): Promise<ClientPassport | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const result = await db.query<ClientPassport>(
    `SELECT * FROM client_passports WHERE tenant_id = $1 AND client_id = $2`,
    [tenantId, clientId]
  )
  return result.rows[0] ?? null
}

// ---------------------------------------------------------------------------
// updateClientPassport - Create or update client passport fields
// ---------------------------------------------------------------------------

export async function updateClientPassport(
  clientId: string,
  updates: z.infer<typeof PassportUpdateSchema>
): Promise<{ success: boolean; passport?: ClientPassport; error?: string }> {
  const validated = PassportUpdateSchema.safeParse(updates)
  if (!validated.success) {
    return { success: false, error: validated.error.message }
  }

  const user = await requireChef()
  const tenantId = user.tenantId!
  const data = validated.data

  const result = await db.query<ClientPassport>(
    `INSERT INTO client_passports (
      tenant_id, client_id,
      communication_mode, preferred_contact_method, chef_autonomy_level,
      auto_approve_under_cents, max_interaction_rounds, standing_instructions,
      default_guest_count, budget_range_min_cents, budget_range_max_cents,
      service_style, default_locations,
      delegate_name, delegate_email, delegate_phone
    ) VALUES (
      $1, $2,
      COALESCE($3, 'direct'), COALESCE($4, 'email'), COALESCE($5, 'moderate'),
      $6, $7, $8,
      COALESCE($9, 2), $10, $11,
      $12, COALESCE($13::jsonb, '[]'::jsonb),
      $14, $15, $16
    )
    ON CONFLICT (tenant_id, client_id)
    DO UPDATE SET
      communication_mode = COALESCE($3, client_passports.communication_mode),
      preferred_contact_method = COALESCE($4, client_passports.preferred_contact_method),
      chef_autonomy_level = COALESCE($5, client_passports.chef_autonomy_level),
      auto_approve_under_cents = $6,
      max_interaction_rounds = $7,
      standing_instructions = $8,
      default_guest_count = COALESCE($9, client_passports.default_guest_count),
      budget_range_min_cents = $10,
      budget_range_max_cents = $11,
      service_style = $12,
      default_locations = COALESCE($13::jsonb, client_passports.default_locations),
      delegate_name = $14,
      delegate_email = $15,
      delegate_phone = $16,
      updated_at = now()
    RETURNING *`,
    [
      tenantId,
      clientId,
      data.communication_mode,
      data.preferred_contact_method,
      data.chef_autonomy_level,
      data.auto_approve_under_cents,
      data.max_interaction_rounds,
      data.standing_instructions,
      data.default_guest_count,
      data.budget_range_min_cents,
      data.budget_range_max_cents,
      data.service_style,
      JSON.stringify(data.default_locations ?? []),
      data.delegate_name,
      data.delegate_email,
      data.delegate_phone,
    ]
  )

  revalidatePath(`/clients/${clientId}`)
  return { success: true, passport: result.rows[0] }
}

// ---------------------------------------------------------------------------
// getClientInsights - AI-generated insights from event history
// ---------------------------------------------------------------------------

export async function getClientInsights(clientId: string): Promise<ClientInsight[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const insights: ClientInsight[] = []

  // Spending trend from events
  const spendingResult = await db.query<{
    event_count: string
    total_cents: string
    avg_cents: string
    min_date: string
    max_date: string
  }>(
    `SELECT
      COUNT(*)::text AS event_count,
      COALESCE(SUM(quoted_price_cents), 0)::text AS total_cents,
      COALESCE(AVG(quoted_price_cents), 0)::text AS avg_cents,
      MIN(event_date)::text AS min_date,
      MAX(event_date)::text AS max_date
    FROM events
    WHERE tenant_id = $1
      AND client_id = $2
      AND status NOT IN ('cancelled', 'draft')`,
    [tenantId, clientId]
  )

  const spending = spendingResult.rows[0]
  if (spending && parseInt(spending.event_count) > 0) {
    const eventCount = parseInt(spending.event_count)
    const avgCents = Math.round(parseFloat(spending.avg_cents))
    insights.push({
      category: 'spending_trend',
      title: 'Spending pattern',
      summary: `${eventCount} event${eventCount !== 1 ? 's' : ''} with an average of $${(avgCents / 100).toFixed(2)} per event.`,
      confidence: Math.min(0.5 + eventCount * 0.1, 0.95),
      evidence_count: eventCount,
    })
  }

  // Scheduling pattern from events
  const scheduleResult = await db.query<{
    preferred_day: string
    day_count: string
  }>(
    `SELECT
      TO_CHAR(event_date, 'Day') AS preferred_day,
      COUNT(*)::text AS day_count
    FROM events
    WHERE tenant_id = $1
      AND client_id = $2
      AND status NOT IN ('cancelled', 'draft')
    GROUP BY TO_CHAR(event_date, 'Day')
    ORDER BY COUNT(*) DESC
    LIMIT 1`,
    [tenantId, clientId]
  )

  if (scheduleResult.rows[0]) {
    const dayRow = scheduleResult.rows[0]
    const dayCount = parseInt(dayRow.day_count)
    if (dayCount >= 2) {
      insights.push({
        category: 'scheduling_pattern',
        title: 'Preferred day',
        summary: `Most events fall on ${dayRow.preferred_day.trim()} (${dayCount} events).`,
        confidence: Math.min(0.4 + dayCount * 0.1, 0.9),
        evidence_count: dayCount,
      })
    }
  }

  // Guest count pattern
  const guestResult = await db.query<{
    avg_guests: string
    event_count: string
  }>(
    `SELECT
      AVG(guest_count)::text AS avg_guests,
      COUNT(*)::text AS event_count
    FROM events
    WHERE tenant_id = $1
      AND client_id = $2
      AND status NOT IN ('cancelled', 'draft')
      AND guest_count IS NOT NULL
      AND guest_count > 0`,
    [tenantId, clientId]
  )

  if (guestResult.rows[0] && parseInt(guestResult.rows[0].event_count) > 0) {
    const avgGuests = Math.round(parseFloat(guestResult.rows[0].avg_guests))
    const count = parseInt(guestResult.rows[0].event_count)
    insights.push({
      category: 'preference_pattern',
      title: 'Typical party size',
      summary: `Averages ${avgGuests} guests across ${count} event${count !== 1 ? 's' : ''}.`,
      confidence: Math.min(0.5 + count * 0.1, 0.95),
      evidence_count: count,
    })
  }

  // Dietary notes from client record
  const dietaryResult = await db.query<{
    dietary_restrictions: string[] | null
    allergies: string[] | null
  }>(
    `SELECT dietary_restrictions, allergies
    FROM clients
    WHERE id = $1 AND tenant_id = $2`,
    [clientId, tenantId]
  )

  const clientRecord = dietaryResult.rows[0]
  if (clientRecord) {
    const restrictions = clientRecord.dietary_restrictions ?? []
    const allergies = clientRecord.allergies ?? []
    const combined = [...restrictions, ...allergies].filter(Boolean)
    if (combined.length > 0) {
      insights.push({
        category: 'dietary_evolution',
        title: 'Dietary profile',
        summary: `Known restrictions/allergies: ${combined.join(', ')}.`,
        confidence: 0.95,
        evidence_count: combined.length,
      })
    }
  }

  return insights
}

// ---------------------------------------------------------------------------
// addClientNote - Chef's private notes (with confidentiality flag)
// ---------------------------------------------------------------------------

export async function addClientNote(
  clientId: string,
  note: string,
  isConfidential: boolean = false
): Promise<{ success: boolean; note?: ClientNote; error?: string }> {
  if (!note || note.trim().length === 0) {
    return { success: false, error: 'Note content is required' }
  }
  if (note.length > 5000) {
    return { success: false, error: 'Note exceeds 5000 character limit' }
  }

  const user = await requireChef()
  const tenantId = user.tenantId!

  const result = await db.query<ClientNote>(
    `INSERT INTO client_notes (tenant_id, client_id, note_text, category, is_confidential, source)
    VALUES ($1, $2, $3, 'general', $4, 'manual')
    RETURNING
      id, tenant_id, client_id,
      note_text AS content,
      is_confidential,
      category, pinned, event_id, source,
      created_at, updated_at`,
    [tenantId, clientId, note.trim(), isConfidential]
  )

  revalidatePath(`/clients/${clientId}`)
  return { success: true, note: result.rows[0] }
}

// ---------------------------------------------------------------------------
// getClientNotes - All notes for a client (respects confidentiality)
// ---------------------------------------------------------------------------

export async function getClientNotes(clientId: string): Promise<ClientNote[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const result = await db.query<ClientNote>(
    `SELECT
      id, tenant_id, client_id,
      note_text AS content,
      COALESCE(is_confidential, false) AS is_confidential,
      category, pinned, event_id, source,
      created_at, updated_at
    FROM client_notes
    WHERE tenant_id = $1 AND client_id = $2
    ORDER BY pinned DESC, created_at DESC`,
    [tenantId, clientId]
  )

  return result.rows
}

// ---------------------------------------------------------------------------
// getClientSpecialDates - Birthdays, anniversaries, recurring events
// ---------------------------------------------------------------------------

export async function getClientSpecialDates(clientId: string): Promise<SpecialDate[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const result = await db.query<SpecialDate>(
    `SELECT id, client_id, tenant_id, label, date::text, recurrence, notes, created_at
    FROM client_special_dates
    WHERE tenant_id = $1 AND client_id = $2
    ORDER BY date ASC`,
    [tenantId, clientId]
  )

  return result.rows
}

// ---------------------------------------------------------------------------
// addClientSpecialDate - Track important dates
// ---------------------------------------------------------------------------

export async function addClientSpecialDate(
  clientId: string,
  input: z.infer<typeof SpecialDateInputSchema>
): Promise<{ success: boolean; specialDate?: SpecialDate; error?: string }> {
  const validated = SpecialDateInputSchema.safeParse(input)
  if (!validated.success) {
    return { success: false, error: validated.error.message }
  }

  const user = await requireChef()
  const tenantId = user.tenantId!
  const data = validated.data

  const result = await db.query<SpecialDate>(
    `INSERT INTO client_special_dates (client_id, tenant_id, label, date, recurrence, notes)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, client_id, tenant_id, label, date::text, recurrence, notes, created_at`,
    [clientId, tenantId, data.label, data.date, data.recurrence, data.notes ?? null]
  )

  revalidatePath(`/clients/${clientId}`)
  return { success: true, specialDate: result.rows[0] }
}
