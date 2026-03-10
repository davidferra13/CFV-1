// Post-Event Waste Tracking
// Records leftover quantities per component after an event.
// Over time, builds a dataset that can adjust portioning recommendations.
// Pure CRUD + aggregation, no AI.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// TYPES
// ============================================

export interface LeftoverDetail {
  id: string
  eventId: string
  componentId: string | null
  itemName: string
  quantityLeftover: number
  unit: string
  originalQuantity: number | null
  disposition: string
  nextEventId: string | null
  storageMethod: string | null
  shelfLifeHours: number | null
  notes: string | null
  capturedAt: string
  // Computed
  wastePercent: number | null // leftover / original * 100
}

export interface EventWasteSummary {
  eventId: string
  eventName: string | null
  eventDate: string | null
  guestCount: number | null
  leftovers: LeftoverDetail[]
  totalItems: number
  // Aggregated stats
  averageWastePercent: number | null
  dispositionBreakdown: { disposition: string; count: number }[]
}

export interface WasteTrend {
  category: string
  averageWastePercent: number
  eventCount: number
  trend: 'improving' | 'stable' | 'worsening'
}

// ============================================
// CORE: Get waste summary for an event
// ============================================

export async function getEventWasteSummary(eventId: string): Promise<EventWasteSummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const chefId = user.tenantId!

  // Get event info
  const { data: event } = await supabase
    .from('events')
    .select('id, title, event_date, guest_count')
    .eq('id', eventId)
    .eq('tenant_id', chefId)
    .single()

  // Get leftover details
  const { data: leftovers } = await supabase
    .from('event_leftover_details')
    .select('*')
    .eq('event_id', eventId)
    .eq('chef_id', chefId)
    .order('captured_at', { ascending: true })

  const mapped: LeftoverDetail[] = (leftovers || []).map((l: any) => {
    const wastePercent =
      l.original_quantity && l.original_quantity > 0
        ? Math.round((l.quantity_leftover / l.original_quantity) * 100)
        : null

    return {
      id: l.id,
      eventId: l.event_id,
      componentId: l.component_id,
      itemName: l.item_name,
      quantityLeftover: parseFloat(l.quantity_leftover),
      unit: l.unit,
      originalQuantity: l.original_quantity ? parseFloat(l.original_quantity) : null,
      disposition: l.disposition,
      nextEventId: l.next_event_id,
      storageMethod: l.storage_method,
      shelfLifeHours: l.shelf_life_hours,
      notes: l.notes,
      capturedAt: l.captured_at,
      wastePercent,
    }
  })

  // Disposition breakdown
  const dispositions = new Map<string, number>()
  for (const l of mapped) {
    dispositions.set(l.disposition, (dispositions.get(l.disposition) || 0) + 1)
  }

  // Average waste percent (only items with original quantity)
  const withOriginal = mapped.filter((l) => l.wastePercent !== null)
  const avgWaste =
    withOriginal.length > 0
      ? Math.round(withOriginal.reduce((sum, l) => sum + l.wastePercent!, 0) / withOriginal.length)
      : null

  return {
    eventId,
    eventName: event?.title ?? null,
    eventDate: event?.event_date ?? null,
    guestCount: event?.guest_count ?? null,
    leftovers: mapped,
    totalItems: mapped.length,
    averageWastePercent: avgWaste,
    dispositionBreakdown: [...dispositions.entries()]
      .map(([disposition, count]) => ({ disposition, count }))
      .sort((a, b) => b.count - a.count),
  }
}

// ============================================
// MUTATIONS
// ============================================

export async function addLeftoverDetail(
  eventId: string,
  input: {
    componentId?: string
    itemName: string
    quantityLeftover: number
    unit: string
    originalQuantity?: number
    disposition?: string
    nextEventId?: string
    storageMethod?: string
    shelfLifeHours?: number
    notes?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const chefId = user.tenantId!

  const { error } = await supabase.from('event_leftover_details').insert({
    chef_id: chefId,
    event_id: eventId,
    component_id: input.componentId || null,
    item_name: input.itemName,
    quantity_leftover: input.quantityLeftover,
    unit: input.unit,
    original_quantity: input.originalQuantity || null,
    disposition: input.disposition || 'discarded',
    next_event_id: input.nextEventId || null,
    storage_method: input.storageMethod || null,
    shelf_life_hours: input.shelfLifeHours || null,
    notes: input.notes || null,
  })

  if (error) return { success: false, error: error.message }

  revalidatePath(`/culinary/menus`)
  return { success: true }
}

export async function removeLeftoverDetail(
  detailId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const chefId = user.tenantId!

  const { error } = await supabase
    .from('event_leftover_details')
    .delete()
    .eq('id', detailId)
    .eq('chef_id', chefId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/culinary/menus`)
  return { success: true }
}

// ============================================
// TRENDS: Waste patterns across events
// ============================================

export async function getWasteTrends(): Promise<WasteTrend[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const chefId = user.tenantId!

  // Get all leftover details with component category info
  const { data: leftovers } = await supabase
    .from('event_leftover_details')
    .select(
      `
      quantity_leftover,
      original_quantity,
      captured_at,
      component:components(category)
    `
    )
    .eq('chef_id', chefId)
    .not('original_quantity', 'is', null)
    .order('captured_at', { ascending: true })

  if (!leftovers || leftovers.length === 0) return []

  // Group by category
  const byCategory = new Map<string, { wastes: number[]; dates: string[] }>()

  for (const l of leftovers) {
    const category = (l.component as any)?.category ?? 'other'
    const origQty = parseFloat(l.original_quantity)
    if (origQty <= 0) continue

    const wastePercent = (parseFloat(l.quantity_leftover) / origQty) * 100
    const existing = byCategory.get(category) || { wastes: [], dates: [] }
    existing.wastes.push(wastePercent)
    existing.dates.push(l.captured_at)
    byCategory.set(category, existing)
  }

  // Compute trends
  const trends: WasteTrend[] = []
  for (const [category, data] of byCategory) {
    const avg = Math.round(data.wastes.reduce((a, b) => a + b, 0) / data.wastes.length)

    // Simple trend: compare first half avg vs second half avg
    let trend: WasteTrend['trend'] = 'stable'
    if (data.wastes.length >= 4) {
      const mid = Math.floor(data.wastes.length / 2)
      const firstHalf = data.wastes.slice(0, mid)
      const secondHalf = data.wastes.slice(mid)
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

      if (secondAvg < firstAvg * 0.85) trend = 'improving'
      else if (secondAvg > firstAvg * 1.15) trend = 'worsening'
    }

    trends.push({
      category,
      averageWastePercent: avg,
      eventCount: data.wastes.length,
      trend,
    })
  }

  return trends.sort((a, b) => b.averageWastePercent - a.averageWastePercent)
}
