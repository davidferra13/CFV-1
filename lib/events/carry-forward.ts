'use server'

// Carry-Forward Inventory
// Fetches reusable leftover ingredients from recent events that haven't been
// transferred to another event yet. Used by the AvailableLeftovers panel on
// the event detail page to bridge physical inventory between events.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type CarryForwardItem = {
  id: string
  ingredientName: string
  estimatedCostCents: number | null
  notes: string | null
  sourceEventId: string
  sourceEventOccasion: string | null
  sourceEventDate: string
  storageLocation: string | null
  useByDate: string | null  // ISO date YYYY-MM-DD, null if not set
}

/**
 * Get reusable leftover ingredients from other recent events that have not
 * yet been allocated to another event. Excludes the current event's own leftovers.
 * Returns up to 20 items ordered by event date descending (most recent first).
 */
export async function getAvailableCarryForwardItems(
  currentEventId: string
): Promise<CarryForwardItem[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch reusable leftovers from other events (no transfer yet)
  const { data, error } = await supabase
    .from('unused_ingredients')
    .select(`
      id,
      ingredient_name,
      estimated_cost_cents,
      notes,
      storage_location,
      use_by_date,
      event_id,
      events!inner(id, occasion, event_date)
    `)
    .eq('tenant_id', user.tenantId!)
    .eq('reason', 'leftover_reusable')
    .eq('expired', false)
    .is('transferred_to_event_id', null)
    .neq('event_id', currentEventId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('[getAvailableCarryForwardItems]', error)
    return []
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    ingredientName: row.ingredient_name,
    estimatedCostCents: row.estimated_cost_cents,
    notes: row.notes,
    storageLocation: row.storage_location ?? null,
    useByDate: row.use_by_date ?? null,
    sourceEventId: row.event_id,
    sourceEventOccasion: row.events?.occasion ?? null,
    sourceEventDate: row.events?.event_date ?? '',
  }))
}
