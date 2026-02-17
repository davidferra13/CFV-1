// Document Generation Server Actions
// Provides document readiness checks for the UI
// Actual PDF generation happens in the API route (returns non-serializable Buffer)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type DocumentReadiness = {
  prepSheet: { ready: boolean; missing: string[] }
  executionSheet: { ready: boolean; missing: string[] }
  checklist: { ready: boolean; missing: string[] }
}

/**
 * Check which documents can be generated for an event
 * Returns readiness status and lists of missing data for each document
 */
export async function getDocumentReadiness(eventId: string): Promise<DocumentReadiness> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Fetch event basics
  const { data: event } = await supabase
    .from('events')
    .select(`
      id, serve_time, arrival_time, dietary_restrictions, allergies,
      guest_count, location_address
    `)
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    return {
      prepSheet: { ready: false, missing: ['Event not found'] },
      executionSheet: { ready: false, missing: ['Event not found'] },
      checklist: { ready: false, missing: ['Event not found'] },
    }
  }

  // Check for menu with dishes and components
  const { data: menus } = await supabase
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .limit(1)

  const hasMenu = menus && menus.length > 0
  let hasDishes = false
  let hasComponents = false

  if (hasMenu) {
    const { count: dishCount } = await supabase
      .from('dishes')
      .select('id', { count: 'exact', head: true })
      .eq('menu_id', menus[0].id)
      .eq('tenant_id', user.tenantId!)

    hasDishes = (dishCount ?? 0) > 0

    if (hasDishes) {
      const { data: dishes } = await supabase
        .from('dishes')
        .select('id')
        .eq('menu_id', menus[0].id)
        .eq('tenant_id', user.tenantId!)

      const dishIds = (dishes || []).map(d => d.id)
      if (dishIds.length > 0) {
        const { count: compCount } = await supabase
          .from('components')
          .select('id', { count: 'exact', head: true })
          .in('dish_id', dishIds)
          .eq('tenant_id', user.tenantId!)

        hasComponents = (compCount ?? 0) > 0
      }
    }
  }

  // Prep sheet needs: menu with dishes and components
  const prepMissing: string[] = []
  if (!hasMenu) prepMissing.push('Menu not attached to event')
  else if (!hasDishes) prepMissing.push('No dishes in menu')
  else if (!hasComponents) prepMissing.push('No components in dishes')

  // Execution sheet needs: menu + dietary info + serve time
  const execMissing: string[] = [...prepMissing]
  if (!event.serve_time) execMissing.push('Serve time not set')

  // Checklist is always generatable (uses defaults if no event-specific data)
  return {
    prepSheet: { ready: prepMissing.length === 0, missing: prepMissing },
    executionSheet: { ready: execMissing.length === 0, missing: execMissing },
    checklist: { ready: true, missing: [] },
  }
}
