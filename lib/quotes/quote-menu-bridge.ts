'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getMenuBreakdown } from '@/lib/menus/intelligence/cost-margin'

// ============================================
// Types
// ============================================

export interface AutoLineItemResult {
  success: boolean
  itemsCreated: number
  error?: string
}

export interface DriftAnalysis {
  hasDrift: boolean
  snapshotCostCents: number | null
  currentCostCents: number | null
  driftPercent: number | null
  driftDirection: 'up' | 'down' | 'none'
  snapshotAt: string | null
  courseChanges: Array<{
    courseName: string
    snapshotCents: number
    currentCents: number
    changePercent: number
  }>
}

export interface SuggestedPrice {
  suggestedCents: number
  components: {
    foodCostCents: number
    laborCostCents: number
    overheadCostCents: number
    travelCostCents: number
  }
  targetMarginPercent: number
  reason: string
}

// ============================================
// Helpers
// ============================================

function numberOrZero(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

// ============================================
// 1. Auto-generate quote line items from menu
// ============================================

export async function autoGenerateQuoteLineItems(quoteId: string): Promise<AutoLineItemResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  try {
    // Fetch quote
    const { data: quote, error: quoteError } = await db
      .from('quotes')
      .select('id, event_id, tenant_id')
      .eq('id', quoteId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (quoteError || !quote) {
      return { success: false, itemsCreated: 0, error: 'Quote not found' }
    }

    if (!quote.event_id) {
      return {
        success: false,
        itemsCreated: 0,
        error: 'Quote has no linked event',
      }
    }

    // Fetch event for menu_id and mileage
    const { data: event } = await db
      .from('events')
      .select('id, menu_id, mileage_miles')
      .eq('id', quote.event_id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    // Try menu_id from event, else look in menus table
    let menuId = event?.menu_id ?? null
    if (!menuId) {
      const { data: menuRow } = await db
        .from('menus')
        .select('id')
        .eq('event_id', quote.event_id)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      menuId = menuRow?.id ?? null
    }

    if (!menuId) {
      return {
        success: false,
        itemsCreated: 0,
        error: 'No menu found for this event',
      }
    }

    // Get menu breakdown
    const breakdown = await getMenuBreakdown(menuId)
    if (!breakdown) {
      return {
        success: false,
        itemsCreated: 0,
        error: 'Could not compute menu cost breakdown',
      }
    }

    // Get chef_pricing_config
    let configOverheadPercent = 15
    let configHourlyRateCents = 5000
    let configMileageRateCents = 70
    try {
      const { data: pricingConfig } = await db
        .from('chef_pricing_config')
        .select('overhead_percent, hourly_rate_cents, mileage_rate_cents')
        .eq('chef_id', tenantId)
        .maybeSingle()

      if (pricingConfig) {
        if (pricingConfig.overhead_percent != null)
          configOverheadPercent = pricingConfig.overhead_percent
        if (pricingConfig.hourly_rate_cents != null)
          configHourlyRateCents = pricingConfig.hourly_rate_cents
        if (pricingConfig.mileage_rate_cents != null)
          configMileageRateCents = pricingConfig.mileage_rate_cents
      }
    } catch {
      // Fall through to defaults
    }

    // Calculate labor from recipe times
    let totalPrepMinutes = 0
    let totalCookMinutes = 0
    try {
      const { data: dishes } = await db
        .from('dishes')
        .select('id')
        .eq('menu_id', menuId)
        .eq('tenant_id', tenantId)
        .limit(500)

      const dishIds = ((dishes ?? []) as any[]).map((d: any) => d.id).filter(Boolean)

      if (dishIds.length > 0) {
        const { data: components } = await db
          .from('components')
          .select('recipe_id')
          .in('dish_id', dishIds)
          .eq('tenant_id', tenantId)
          .not('recipe_id', 'is', null)
          .limit(500)

        const recipeIds = [
          ...new Set(((components ?? []) as any[]).map((c: any) => c.recipe_id).filter(Boolean)),
        ] as string[]

        if (recipeIds.length > 0) {
          const { data: recipes } = await db
            .from('recipes')
            .select('prep_time_minutes, cook_time_minutes')
            .in('id', recipeIds)
            .eq('tenant_id', tenantId)

          for (const r of (recipes ?? []) as any[]) {
            totalPrepMinutes += numberOrZero(r.prep_time_minutes)
            totalCookMinutes += numberOrZero(r.cook_time_minutes)
          }
        }
      }
    } catch {
      // Non-critical
    }

    const laborHours = (totalPrepMinutes + totalCookMinutes) / 60
    const laborCostCents = Math.round(laborHours * configHourlyRateCents)
    const overheadCostCents = Math.round((breakdown.totalCostCents * configOverheadPercent) / 100)
    const mileageMiles = numberOrZero(event?.mileage_miles)
    const travelCostCents = Math.round(mileageMiles * configMileageRateCents)

    // Delete existing auto-generated line items
    await db
      .from('quote_line_items')
      .delete()
      .eq('quote_id', quoteId)
      .eq('tenant_id', tenantId)
      .eq('source_note', 'auto_from_menu')

    // Build line items
    const lineItems: Array<{
      quote_id: string
      tenant_id: string
      label: string
      amount_cents: number
      sort_order: number
      is_visible_to_client: boolean
      source_note: string
    }> = []

    let sortOrder = 0

    // Food cost (ingredients)
    lineItems.push({
      quote_id: quoteId,
      tenant_id: tenantId,
      label: 'Food Cost (ingredients)',
      amount_cents: breakdown.totalCostCents,
      sort_order: sortOrder++,
      is_visible_to_client: false,
      source_note: 'auto_from_menu',
    })

    // Per-course subtotals
    for (const course of breakdown.courses) {
      lineItems.push({
        quote_id: quoteId,
        tenant_id: tenantId,
        label: `Course: ${course.courseName || `Course ${course.courseNumber}`}`,
        amount_cents: course.totalCostCents,
        sort_order: sortOrder++,
        is_visible_to_client: false,
        source_note: 'auto_from_menu',
      })
    }

    // Labor
    if (laborCostCents > 0) {
      lineItems.push({
        quote_id: quoteId,
        tenant_id: tenantId,
        label: 'Labor',
        amount_cents: laborCostCents,
        sort_order: sortOrder++,
        is_visible_to_client: false,
        source_note: 'auto_from_menu',
      })
    }

    // Overhead
    if (overheadCostCents > 0) {
      lineItems.push({
        quote_id: quoteId,
        tenant_id: tenantId,
        label: 'Overhead',
        amount_cents: overheadCostCents,
        sort_order: sortOrder++,
        is_visible_to_client: false,
        source_note: 'auto_from_menu',
      })
    }

    // Travel
    if (travelCostCents > 0) {
      lineItems.push({
        quote_id: quoteId,
        tenant_id: tenantId,
        label: 'Travel',
        amount_cents: travelCostCents,
        sort_order: sortOrder++,
        is_visible_to_client: false,
        source_note: 'auto_from_menu',
      })
    }

    // Insert all line items
    if (lineItems.length > 0) {
      const { error: insertError } = await db.from('quote_line_items').insert(lineItems)

      if (insertError) {
        console.error('[autoGenerateQuoteLineItems] Insert error:', insertError)
        return {
          success: false,
          itemsCreated: 0,
          error: 'Failed to insert line items',
        }
      }
    }

    return { success: true, itemsCreated: lineItems.length }
  } catch (err) {
    console.error('[autoGenerateQuoteLineItems] Unexpected error:', err)
    return {
      success: false,
      itemsCreated: 0,
      error: 'An unexpected error occurred',
    }
  }
}

// ============================================
// 2. Detect quote drift
// ============================================

export async function detectQuoteDrift(quoteId: string): Promise<DriftAnalysis | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Fetch quote -> event
  const { data: quote } = await db
    .from('quotes')
    .select('id, event_id')
    .eq('id', quoteId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!quote?.event_id) return null

  // Fetch event snapshot data
  const { data: event } = await db
    .from('events')
    .select('id, menu_id, menu_cost_snapshot_cents, menu_cost_snapshot_at')
    .eq('id', quote.event_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!event) return null

  const snapshotCostCents = event.menu_cost_snapshot_cents ?? null
  const snapshotAt = event.menu_cost_snapshot_at ?? null

  // Find menu
  let menuId = event.menu_id ?? null
  if (!menuId) {
    const { data: menuRow } = await db
      .from('menus')
      .select('id')
      .eq('event_id', quote.event_id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    menuId = menuRow?.id ?? null
  }

  if (!menuId) return null

  // Get current menu cost
  let breakdown: Awaited<ReturnType<typeof getMenuBreakdown>> = null
  try {
    breakdown = await getMenuBreakdown(menuId)
  } catch {
    return null
  }

  if (!breakdown) return null

  const currentCostCents = breakdown.totalCostCents

  // If no snapshot exists, no drift to detect
  if (snapshotCostCents === null) {
    return {
      hasDrift: false,
      snapshotCostCents: null,
      currentCostCents,
      driftPercent: null,
      driftDirection: 'none',
      snapshotAt: null,
      courseChanges: [],
    }
  }

  const driftCents = currentCostCents - snapshotCostCents
  const driftPercent =
    snapshotCostCents > 0
      ? Math.round((Math.abs(driftCents) / snapshotCostCents) * 1000) / 10
      : null
  const driftDirection: 'up' | 'down' | 'none' =
    driftCents > 0 ? 'up' : driftCents < 0 ? 'down' : 'none'

  // Course-level changes (we don't have per-course snapshots, so just report current)
  const courseChanges = breakdown.courses.map((course) => ({
    courseName: course.courseName || `Course ${course.courseNumber}`,
    snapshotCents: 0, // No per-course snapshot available
    currentCents: course.totalCostCents,
    changePercent: 0,
  }))

  return {
    hasDrift: driftPercent !== null && driftPercent > 5,
    snapshotCostCents,
    currentCostCents,
    driftPercent,
    driftDirection,
    snapshotAt,
    courseChanges,
  }
}

// ============================================
// 3. Suggest price from cost
// ============================================

export async function suggestPriceFromCost(
  eventId: string,
  targetMarginPercent?: number
): Promise<SuggestedPrice | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get default target margin from chef preferences if not provided
  let effectiveMargin = targetMarginPercent ?? 60
  if (targetMarginPercent == null) {
    try {
      const { getChefPreferences } = await import('@/lib/chef/actions')
      const prefs = await getChefPreferences()
      if (prefs?.target_margin_percent != null) {
        effectiveMargin = prefs.target_margin_percent
      }
    } catch {
      // Fall through to default
    }
  }

  // Get event
  const { data: event } = await db
    .from('events')
    .select('id, menu_id, mileage_miles')
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!event) return null

  // Find menu
  let menuId = event.menu_id ?? null
  if (!menuId) {
    const { data: menuRow } = await db
      .from('menus')
      .select('id')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    menuId = menuRow?.id ?? null
  }

  if (!menuId) return null

  // Get menu breakdown
  let breakdown: Awaited<ReturnType<typeof getMenuBreakdown>> = null
  try {
    breakdown = await getMenuBreakdown(menuId)
  } catch {
    return null
  }

  if (!breakdown) return null

  // Get chef_pricing_config
  let configOverheadPercent = 15
  let configHourlyRateCents = 5000
  let configMileageRateCents = 70
  try {
    const { data: pricingConfig } = await db
      .from('chef_pricing_config')
      .select('overhead_percent, hourly_rate_cents, mileage_rate_cents')
      .eq('chef_id', tenantId)
      .maybeSingle()

    if (pricingConfig) {
      if (pricingConfig.overhead_percent != null)
        configOverheadPercent = pricingConfig.overhead_percent
      if (pricingConfig.hourly_rate_cents != null)
        configHourlyRateCents = pricingConfig.hourly_rate_cents
      if (pricingConfig.mileage_rate_cents != null)
        configMileageRateCents = pricingConfig.mileage_rate_cents
    }
  } catch {
    // Fall through to defaults
  }

  // Calculate labor
  let totalPrepMinutes = 0
  let totalCookMinutes = 0
  try {
    const { data: dishes } = await db
      .from('dishes')
      .select('id')
      .eq('menu_id', menuId)
      .eq('tenant_id', tenantId)
      .limit(500)

    const dishIds = ((dishes ?? []) as any[]).map((d: any) => d.id).filter(Boolean)

    if (dishIds.length > 0) {
      const { data: components } = await db
        .from('components')
        .select('recipe_id')
        .in('dish_id', dishIds)
        .eq('tenant_id', tenantId)
        .not('recipe_id', 'is', null)
        .limit(500)

      const recipeIds = [
        ...new Set(((components ?? []) as any[]).map((c: any) => c.recipe_id).filter(Boolean)),
      ] as string[]

      if (recipeIds.length > 0) {
        const { data: recipes } = await db
          .from('recipes')
          .select('prep_time_minutes, cook_time_minutes')
          .in('id', recipeIds)
          .eq('tenant_id', tenantId)

        for (const r of (recipes ?? []) as any[]) {
          totalPrepMinutes += numberOrZero(r.prep_time_minutes)
          totalCookMinutes += numberOrZero(r.cook_time_minutes)
        }
      }
    }
  } catch {
    // Non-critical
  }

  const laborHours = (totalPrepMinutes + totalCookMinutes) / 60
  const laborCostCents = Math.round(laborHours * configHourlyRateCents)
  const overheadCostCents = Math.round((breakdown.totalCostCents * configOverheadPercent) / 100)
  const mileageMiles = numberOrZero(event.mileage_miles)
  const travelCostCents = Math.round(mileageMiles * configMileageRateCents)

  const totalCost = breakdown.totalCostCents + laborCostCents + overheadCostCents + travelCostCents

  if (effectiveMargin >= 100 || totalCost <= 0) return null

  const suggestedCents = Math.round(totalCost / (1 - effectiveMargin / 100))

  return {
    suggestedCents,
    components: {
      foodCostCents: breakdown.totalCostCents,
      laborCostCents,
      overheadCostCents,
      travelCostCents,
    },
    targetMarginPercent: effectiveMargin,
    reason: `Calculated from ${breakdown.courses.length} course${breakdown.courses.length !== 1 ? 's' : ''} with a ${effectiveMargin}% target margin`,
  }
}
