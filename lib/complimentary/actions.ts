// Complimentary Intelligence - Server Actions
// Manage comp items, generate suggestions, track outcomes

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { detectCompOpportunities } from './detection-engine'
import type {
  ComplimentaryItem,
  ComplimentarySuggestion,
  CompDetectionContext,
  CompItemStatus,
} from '@/lib/private-context/types'

// ============================================================
// VALIDATION
// ============================================================

const CreateCompItemSchema = z.object({
  event_id: z.string().uuid(),
  secret_id: z.string().uuid().nullable().optional(),
  item_type: z.enum(['true_comp', 'piggyback', 'reuse']).default('true_comp'),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  estimated_cost_cents: z.number().int().min(0).optional(),
  suggestion_source: z.enum(['ai', 'manual', 'carry_forward', 'intelligence']).default('manual'),
  suggestion_reason: z.string().max(1000).nullable().optional(),
})

const UpdateCompItemSchema = z.object({
  status: z.enum(['suggested', 'accepted', 'rejected', 'executed']).optional(),
  actual_cost_cents: z.number().int().min(0).nullable().optional(),
  client_reaction: z.string().max(2000).nullable().optional(),
  retention_impact: z.string().max(2000).nullable().optional(),
  executed_at: z.string().datetime().nullable().optional(),
})

// ============================================================
// COMP ITEMS CRUD
// ============================================================

export async function createCompItem(
  input: z.infer<typeof CreateCompItemSchema>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const user = await requireChef()
    const validated = CreateCompItemSchema.parse(input)
    const db: any = createServerClient()

    const { data, error } = await db
      .from('complimentary_items')
      .insert({
        tenant_id: user.tenantId,
        event_id: validated.event_id,
        secret_id: validated.secret_id ?? null,
        item_type: validated.item_type,
        name: validated.name,
        description: validated.description ?? null,
        estimated_cost_cents: validated.estimated_cost_cents ?? 0,
        suggestion_source: validated.suggestion_source,
        suggestion_reason: validated.suggestion_reason ?? null,
      })
      .select('id')
      .single()

    if (error) throw error

    // Emit CIL signal (non-blocking)
    try {
      const { notifyCIL } = await import('@/lib/cil/notify')
      await notifyCIL({
        tenantId: user.tenantId!,
        source: 'db_mutation',
        entityIds: [`event_${validated.event_id}`],
        payload: {
          action: 'comp_item_created',
          itemType: validated.item_type,
          name: validated.name,
        },
      })
    } catch (_) {
      // non-blocking
    }

    revalidatePath('/', 'layout')
    return { success: true, id: data.id }
  } catch (err) {
    console.error('[Comp] createItem failed', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function getEventCompItems(eventId: string): Promise<ComplimentaryItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('complimentary_items')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('event_id', eventId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as ComplimentaryItem[]
}

export async function updateCompItem(
  id: string,
  input: z.infer<typeof UpdateCompItemSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const validated = UpdateCompItemSchema.parse(input)
    const db: any = createServerClient()

    const updates: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(validated)) {
      if (val !== undefined) updates[key] = val
    }

    // Auto-set executed_at when status changes to executed
    if (validated.status === 'executed' && !validated.executed_at) {
      updates.executed_at = new Date().toISOString()
    }

    const { error } = await db
      .from('complimentary_items')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', user.tenantId)

    if (error) throw error

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('[Comp] updateItem failed', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function deleteCompItem(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    const { error } = await db
      .from('complimentary_items')
      .delete()
      .eq('id', id)
      .eq('tenant_id', user.tenantId)

    if (error) throw error

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('[Comp] deleteItem failed', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================================
// SUGGESTIONS
// ============================================================

export async function getEventCompSuggestions(eventId: string): Promise<ComplimentarySuggestion[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('complimentary_suggestions')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .order('confidence_score', { ascending: false })

  if (error) throw error
  return (data ?? []) as ComplimentarySuggestion[]
}

export async function acceptSuggestion(
  suggestionId: string
): Promise<{ success: boolean; compItemId?: string; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    // Get the suggestion
    const { data: suggestion, error: fetchErr } = await db
      .from('complimentary_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .eq('tenant_id', user.tenantId)
      .single()

    if (fetchErr || !suggestion) return { success: false, error: 'Suggestion not found' }

    // Mark suggestion as accepted
    await db
      .from('complimentary_suggestions')
      .update({ status: 'accepted' })
      .eq('id', suggestionId)

    // Create a comp item from the suggestion
    const { data: compItem, error: createErr } = await db
      .from('complimentary_items')
      .insert({
        tenant_id: user.tenantId,
        event_id: suggestion.event_id,
        item_type: suggestion.suggestion_type === 'reusable_component' ? 'reuse' : 'true_comp',
        name: suggestion.title,
        description: suggestion.description,
        estimated_cost_cents: suggestion.estimated_cost_cents,
        suggestion_source: 'intelligence',
        suggestion_reason: suggestion.reasoning,
        status: 'accepted',
      })
      .select('id')
      .single()

    if (createErr) throw createErr

    revalidatePath('/', 'layout')
    return { success: true, compItemId: compItem.id }
  } catch (err) {
    console.error('[Comp] acceptSuggestion failed', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function rejectSuggestion(suggestionId: string): Promise<{ success: boolean }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    await db
      .from('complimentary_suggestions')
      .update({ status: 'rejected' })
      .eq('id', suggestionId)
      .eq('tenant_id', user.tenantId)

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('[Comp] rejectSuggestion failed', err)
    return { success: false }
  }
}

// ============================================================
// GENERATE SUGGESTIONS (run detection engine for an event)
// ============================================================

export async function generateCompSuggestions(
  eventId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    // Build detection context from real data
    const ctx = await buildDetectionContext(user.tenantId!, eventId, db)
    if (!ctx) return { success: false, error: 'Could not build event context' }

    // Run deterministic detection engine
    const result = detectCompOpportunities(ctx)

    if (result.suggestions.length === 0) {
      return { success: true, count: 0 }
    }

    // Expire old pending suggestions for this event
    await db
      .from('complimentary_suggestions')
      .update({ status: 'expired' })
      .eq('tenant_id', user.tenantId)
      .eq('event_id', eventId)
      .eq('status', 'pending')

    // Insert new suggestions
    const rows = result.suggestions.map(s => ({
      tenant_id: user.tenantId,
      event_id: eventId,
      suggestion_type: s.type,
      title: s.title,
      description: s.description,
      reasoning: s.reasoning,
      estimated_cost_cents: s.estimatedCostCents,
      effort_level: s.effortLevel,
      confidence_score: s.confidenceScore,
      source_data: s.sourceData,
      // Expire suggestions 7 days after event or 30 days, whichever is sooner
      expires_at: ctx.eventDate
        ? new Date(new Date(ctx.eventDate).getTime() + 7 * 86400000).toISOString()
        : new Date(Date.now() + 30 * 86400000).toISOString(),
    }))

    const { error } = await db.from('complimentary_suggestions').insert(rows)
    if (error) throw error

    revalidatePath('/', 'layout')
    return { success: true, count: result.suggestions.length }
  } catch (err) {
    console.error('[Comp] generateSuggestions failed', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================================
// ANALYTICS
// ============================================================

export async function getCompAnalytics(): Promise<{
  totalComps: number
  totalCostCents: number
  byType: Record<string, number>
  bySource: Record<string, number>
  acceptanceRate: number
  avgCostCents: number
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: items } = await db
    .from('complimentary_items')
    .select('*')
    .eq('tenant_id', user.tenantId)

  const { data: suggestions } = await db
    .from('complimentary_suggestions')
    .select('status')
    .eq('tenant_id', user.tenantId)

  const allItems = (items ?? []) as ComplimentaryItem[]
  const allSuggestions = (suggestions ?? []) as { status: string }[]

  const executed = allItems.filter(i => i.status === 'executed')
  const totalCost = executed.reduce((sum, i) => sum + (i.actual_cost_cents ?? i.estimated_cost_cents), 0)

  const byType: Record<string, number> = {}
  const bySource: Record<string, number> = {}
  for (const item of allItems) {
    byType[item.item_type] = (byType[item.item_type] ?? 0) + 1
    bySource[item.suggestion_source] = (bySource[item.suggestion_source] ?? 0) + 1
  }

  const accepted = allSuggestions.filter(s => s.status === 'accepted').length
  const total = allSuggestions.filter(s => s.status !== 'pending' && s.status !== 'expired').length

  return {
    totalComps: allItems.length,
    totalCostCents: totalCost,
    byType,
    bySource,
    acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
    avgCostCents: executed.length > 0 ? Math.round(totalCost / executed.length) : 0,
  }
}

// ============================================================
// CONTEXT BUILDER (internal)
// ============================================================

async function buildDetectionContext(
  tenantId: string,
  eventId: string,
  db: any
): Promise<CompDetectionContext | null> {
  // Fetch event
  const { data: event } = await db
    .from('events')
    .select('id, client_id, event_date, occasion, guest_count, dietary_restrictions, allergies, quoted_price_cents')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()

  if (!event) return null

  // Parallel fetches
  const [menuRes, prefRes, menuPrefRes, carryRes, pastEventsRes, pastCompsRes, financialRes] =
    await Promise.all([
      // Menu dishes
      db
        .from('menus')
        .select('id, dishes(id, course_name, description, dietary_tags)')
        .eq('event_id', eventId)
        .eq('tenant_id', tenantId)
        .limit(1)
        .single(),
      // Client preferences
      event.client_id
        ? db
            .from('clients')
            .select('dietary_restrictions, allergies, what_they_care_about')
            .eq('id', event.client_id)
            .single()
        : Promise.resolve({ data: null }),
      // Menu preferences
      event.client_id
        ? db
            .from('menu_preferences')
            .select('cuisine_preferences, foods_love, foods_avoid, adventurousness')
            .eq('event_id', eventId)
            .limit(1)
            .single()
        : Promise.resolve({ data: null }),
      // Carry-forward items
      db
        .from('unused_ingredients')
        .select('ingredient_name, estimated_cost_cents, source_event_id')
        .eq('tenant_id', tenantId)
        .eq('expired', false)
        .is('transferred_to_event_id', null)
        .eq('reason', 'leftover_reusable')
        .limit(20),
      // Past events for this client
      event.client_id
        ? db
            .from('events')
            .select('id, event_date, occasion')
            .eq('tenant_id', tenantId)
            .eq('client_id', event.client_id)
            .neq('id', eventId)
            .in('status', ['completed', 'in_progress', 'confirmed', 'paid'])
            .order('event_date', { ascending: false })
            .limit(50)
        : Promise.resolve({ data: [] }),
      // Past comp items for this client's events
      event.client_id
        ? db
            .from('complimentary_items')
            .select('*')
            .eq('tenant_id', tenantId)
            .in('status', ['accepted', 'executed'])
        : Promise.resolve({ data: [] }),
      // Financial summary (from event directly)
      db
        .from('event_financial_summary')
        .select('quoted_price_cents, total_expenses_cents, profit_cents, profit_margin')
        .eq('event_id', eventId)
        .single(),
    ])

  const dishes = menuRes.data?.dishes ?? []
  const clientPref = prefRes.data
  const menuPref = menuPrefRes.data
  const carryItems = carryRes.data ?? []
  const pastEvents = pastEventsRes.data ?? []
  const pastComps = pastCompsRes.data ?? []
  const financial = financialRes.data

  return {
    tenantId,
    eventId,
    clientId: event.client_id,
    eventDate: event.event_date,
    occasion: event.occasion,
    guestCount: event.guest_count ?? 0,
    menuDishes: dishes.map((d: any) => ({
      name: d.description || d.course_name || '',
      course: d.course_name || '',
      dietaryTags: d.dietary_tags ?? [],
    })),
    clientPreferences: clientPref
      ? {
          cuisinePreferences: [],
          foodsLove: [],
          foodsAvoid: [],
          dietaryRestrictions: clientPref.dietary_restrictions ?? [],
          allergies: clientPref.allergies ?? [],
        }
      : null,
    menuPreferences: menuPref
      ? {
          cuisinePreferences: menuPref.cuisine_preferences ?? [],
          foodsLove: menuPref.foods_love ?? '',
          foodsAvoid: menuPref.foods_avoid ?? '',
          adventurousness: menuPref.adventurousness,
        }
      : null,
    reusableItems: carryItems.map((i: any) => ({
      name: i.ingredient_name,
      estimatedCostCents: i.estimated_cost_cents ?? 0,
      sourceEvent: i.source_event_id,
    })),
    quotedPriceCents: financial?.quoted_price_cents ?? event.quoted_price_cents ?? 0,
    foodCostCents: financial?.total_expenses_cents ?? 0,
    profitMarginPercent: financial?.profit_margin ?? 0,
    pastEvents: pastEvents.map((e: any) => ({
      id: e.id,
      date: e.event_date,
      occasion: e.occasion,
    })),
    pastCompItems: pastComps as ComplimentaryItem[],
  }
}
