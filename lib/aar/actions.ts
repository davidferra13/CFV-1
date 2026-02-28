// Event Review (AAR) Server Actions
// Post-event feedback loop: ratings, forgotten items, notes
// Feeds the Non-Negotiables learning system

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// --- Validation Schemas ---

const CreateAARSchema = z.object({
  event_id: z.string().uuid(),
  calm_rating: z.number().int().min(1).max(5),
  preparation_rating: z.number().int().min(1).max(5),
  execution_rating: z.number().int().min(1).max(5).optional(),
  could_have_done_earlier: z.string().optional(),
  forgotten_items: z.array(z.string()).optional(),
  what_went_well: z.string().optional(),
  what_went_wrong: z.string().optional(),
  menu_performance_notes: z.string().optional(),
  client_behavior_notes: z.string().optional(),
  site_notes: z.string().optional(),
  general_notes: z.string().optional(),
  would_do_differently: z.string().optional(),
})

const UpdateAARSchema = z.object({
  calm_rating: z.number().int().min(1).max(5).optional(),
  preparation_rating: z.number().int().min(1).max(5).optional(),
  execution_rating: z.number().int().min(1).max(5).nullable().optional(),
  could_have_done_earlier: z.string().nullable().optional(),
  forgotten_items: z.array(z.string()).optional(),
  what_went_well: z.string().nullable().optional(),
  what_went_wrong: z.string().nullable().optional(),
  menu_performance_notes: z.string().nullable().optional(),
  client_behavior_notes: z.string().nullable().optional(),
  site_notes: z.string().nullable().optional(),
  general_notes: z.string().nullable().optional(),
  would_do_differently: z.string().nullable().optional(),
})

export type CreateAARInput = z.infer<typeof CreateAARSchema>
export type UpdateAARInput = z.infer<typeof UpdateAARSchema>

/**
 * Create an Event Review for a completed event
 * Sets aar_filed = true on the linked event
 */
export async function createAAR(input: CreateAARInput) {
  const user = await requireChef()
  const validated = CreateAARSchema.parse(input)
  const supabase: any = createServerClient()

  // Verify event belongs to this tenant and exists
  const { data: event } = await supabase
    .from('events')
    .select('id, status, aar_filed')
    .eq('id', validated.event_id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    throw new Error('Event not found')
  }

  if (event.aar_filed) {
    throw new Error('AAR already filed for this event')
  }

  // Insert AAR
  const { data: aar, error } = await supabase
    .from('after_action_reviews')
    .insert({
      tenant_id: user.tenantId!,
      event_id: validated.event_id,
      calm_rating: validated.calm_rating,
      preparation_rating: validated.preparation_rating,
      execution_rating: validated.execution_rating,
      could_have_done_earlier: validated.could_have_done_earlier,
      forgotten_items: validated.forgotten_items ?? [],
      what_went_well: validated.what_went_well,
      what_went_wrong: validated.what_went_wrong,
      menu_performance_notes: validated.menu_performance_notes,
      client_behavior_notes: validated.client_behavior_notes,
      site_notes: validated.site_notes,
      general_notes: validated.general_notes,
      would_do_differently: validated.would_do_differently,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('[createAAR] Error:', error)
    throw new Error('Failed to create AAR')
  }

  // Mark event as AAR filed
  const { error: updateError } = await supabase
    .from('events')
    .update({ aar_filed: true, updated_by: user.id })
    .eq('id', validated.event_id)
    .eq('tenant_id', user.tenantId!)

  if (updateError) {
    console.error('[createAAR] Failed to update event aar_filed:', updateError)
  }

  revalidatePath(`/events/${validated.event_id}`)
  revalidatePath(`/events/${validated.event_id}/aar`)
  revalidatePath('/dashboard')
  revalidatePath('/aar')

  // Log chef activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'aar_filed',
      domain: 'operational',
      entityType: 'after_action_review',
      entityId: aar.id,
      summary: `Filed after-action review — calm: ${validated.calm_rating}/5, prep: ${validated.preparation_rating}/5`,
      context: {
        event_id: validated.event_id,
        calm_rating: validated.calm_rating,
        preparation_rating: validated.preparation_rating,
        execution_rating: validated.execution_rating,
      },
    })
  } catch (err) {
    console.error('[createAAR] Activity log failed (non-blocking):', err)
  }

  return { success: true, aar }
}

/**
 * Get AAR for a specific event (returns null if not yet filed)
 */
export async function getAARByEventId(eventId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: aar, error } = await supabase
    .from('after_action_reviews')
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows returned (not found is expected)
    console.error('[getAARByEventId] Error:', error)
  }

  return aar ?? null
}

/**
 * Get single AAR by ID with event context
 */
export async function getAAR(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: aar, error } = await supabase
    .from('after_action_reviews')
    .select(
      `
      *,
      event:events(id, occasion, event_date, guest_count, status, client:clients(id, full_name, email))
    `
    )
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) {
    console.error('[getAAR] Error:', error)
    return null
  }

  return aar
}

/**
 * Update an existing AAR (chef may add notes after initial filing)
 */
export async function updateAAR(id: string, input: UpdateAARInput) {
  const user = await requireChef()
  const validated = UpdateAARSchema.parse(input)
  const supabase: any = createServerClient()

  // Verify AAR exists and belongs to tenant
  const { data: existing } = await supabase
    .from('after_action_reviews')
    .select('id, event_id')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!existing) {
    throw new Error('AAR not found')
  }

  const { data: aar, error } = await supabase
    .from('after_action_reviews')
    .update({
      ...validated,
      updated_by: user.id,
    })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    console.error('[updateAAR] Error:', error)
    throw new Error('Failed to update AAR')
  }

  revalidatePath(`/events/${existing.event_id}`)
  revalidatePath(`/events/${existing.event_id}/aar`)
  revalidatePath('/aar')

  return { success: true, aar }
}

/**
 * Get completed events that haven't had an AAR filed yet.
 * Used by the AAR list page to let chefs pick which event to review.
 */
export async function getEventsWithoutAAR() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: events, error } = await supabase
    .from('events')
    .select(
      `
      id, occasion, event_date, guest_count,
      client:clients(id, full_name)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .eq('aar_filed', false)
    .order('event_date', { ascending: false })

  if (error) {
    console.error('[getEventsWithoutAAR] Error:', error)
    return []
  }

  return events
}

/**
 * Get recent AARs across all events with event context
 */
export async function getRecentAARs(limit = 10) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: aars, error } = await supabase
    .from('after_action_reviews')
    .select(
      `
      *,
      event:events(id, occasion, event_date, guest_count, status, client:clients(id, full_name))
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getRecentAARs] Error:', error)
    throw new Error('Failed to fetch AARs')
  }

  return aars
}

/**
 * Aggregate AAR stats for dashboard and self-assessment
 */
export async function getAARStats() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch all AARs ordered by event date for trend analysis
  const { data: aars, error } = await supabase
    .from('after_action_reviews')
    .select(
      `
      calm_rating,
      preparation_rating,
      forgotten_items,
      created_at,
      event:events(event_date)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getAARStats] Error:', error)
    return null
  }

  if (!aars || aars.length === 0) {
    return {
      totalReviews: 0,
      avgCalmRating: 0,
      avgPrepRating: 0,
      last5AvgCalm: 0,
      last5AvgPrep: 0,
      trendDirection: 'neutral' as const,
      topForgottenItems: [] as { item: string; count: number }[],
    }
  }

  // Overall averages
  const totalCalm = aars.reduce((sum: any, a: any) => sum + a.calm_rating, 0)
  const totalPrep = aars.reduce((sum: any, a: any) => sum + a.preparation_rating, 0)
  const avgCalmRating = totalCalm / aars.length
  const avgPrepRating = totalPrep / aars.length

  // Last 5 events averages
  const last5 = aars.slice(0, 5)
  const last5AvgCalm = last5.reduce((sum: any, a: any) => sum + a.calm_rating, 0) / last5.length
  const last5AvgPrep =
    last5.reduce((sum: any, a: any) => sum + a.preparation_rating, 0) / last5.length

  // Trend: compare last 5 avg calm to overall avg calm
  let trendDirection: 'improving' | 'declining' | 'neutral' = 'neutral'
  if (aars.length >= 5) {
    if (last5AvgCalm > avgCalmRating + 0.2) trendDirection = 'improving'
    else if (last5AvgCalm < avgCalmRating - 0.2) trendDirection = 'declining'
  }

  // Forgotten items frequency
  const itemCounts = new Map<string, number>()
  for (const aar of aars) {
    if (aar.forgotten_items) {
      for (const item of aar.forgotten_items) {
        const normalized = item.toLowerCase().trim()
        if (normalized) {
          itemCounts.set(normalized, (itemCounts.get(normalized) ?? 0) + 1)
        }
      }
    }
  }

  const topForgottenItems = Array.from(itemCounts.entries())
    .map(([item, count]) => ({ item, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalReviews: aars.length,
    avgCalmRating: Math.round(avgCalmRating * 10) / 10,
    avgPrepRating: Math.round(avgPrepRating * 10) / 10,
    last5AvgCalm: Math.round(last5AvgCalm * 10) / 10,
    last5AvgPrep: Math.round(last5AvgPrep * 10) / 10,
    trendDirection,
    topForgottenItems,
  }
}

/**
 * Get frequency of forgotten items across all AARs
 * Items forgotten 2+ times should be flagged for promotion to permanent checklist
 */
export async function getForgottenItemsFrequency() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: aars, error } = await supabase
    .from('after_action_reviews')
    .select('forgotten_items')
    .eq('tenant_id', user.tenantId!)

  if (error) {
    console.error('[getForgottenItemsFrequency] Error:', error)
    return []
  }

  const itemCounts = new Map<string, number>()
  for (const aar of aars) {
    if (aar.forgotten_items) {
      for (const item of aar.forgotten_items) {
        const normalized = item.toLowerCase().trim()
        if (normalized) {
          itemCounts.set(normalized, (itemCounts.get(normalized) ?? 0) + 1)
        }
      }
    }
  }

  return Array.from(itemCounts.entries())
    .map(([item, count]) => ({ item, count }))
    .sort((a, b) => b.count - a.count)
}
