// Document Generation Server Actions
// Provides document readiness checks and business doc info for the UI
// Actual PDF generation happens in the API route (returns non-serializable Buffer)

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Business doc info ────────────────────────────────────────────────────────

export type BusinessDocInfo = {
  quote: { id: string; status: string; ref: string } | null
  contract: { id: string; status: string; signedAt: string | null } | null
  invoiceNumber: string | null
}

/**
 * Returns quote, contract, and invoice info for an event.
 * Used to populate the Business Documents section on the event detail page.
 */
export async function getBusinessDocInfo(eventId: string): Promise<BusinessDocInfo> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event } = await db
    .from('events')
    .select('invoice_number, inquiry_id')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  // Most recent quote by event_id
  const { data: eventQuotes } = await db
    .from('quotes')
    .select('id, status, created_at')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(1)

  let quoteRow = eventQuotes?.[0] ?? null

  // Fallback: quote linked via inquiry
  if (!quoteRow && event?.inquiry_id) {
    const { data: inquiryQuotes } = await db
      .from('quotes')
      .select('id, status, created_at')
      .eq('inquiry_id', event.inquiry_id)
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: false })
      .limit(1)
    quoteRow = inquiryQuotes?.[0] ?? null
  }

  // Most recent contract - scope by tenant_id (not chef_id) to match the
  // established tenant-isolation pattern used everywhere else in the codebase.
  const { data: contracts } = await db
    .from('event_contracts')
    .select('id, status, signed_at')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(1)

  const contractRow = contracts?.[0] ?? null

  return {
    quote: quoteRow
      ? {
          id: quoteRow.id,
          status: quoteRow.status,
          ref: `QUOTE-${new Date(quoteRow.created_at).getFullYear()}-${quoteRow.id.replace(/-/g, '').slice(0, 4).toUpperCase()}`,
        }
      : null,
    contract: contractRow
      ? {
          id: contractRow.id,
          status: contractRow.status,
          signedAt: contractRow.signed_at ?? null,
        }
      : null,
    invoiceNumber: event?.invoice_number ?? null,
  }
}

// ─── Document readiness ───────────────────────────────────────────────────────

export type DocumentReadiness = {
  eventSummary: { ready: boolean; missing: string[] }
  groceryList: { ready: boolean; missing: string[] }
  frontOfHouseMenu: { ready: boolean; missing: string[] }
  prepSheet: { ready: boolean; missing: string[] }
  executionSheet: { ready: boolean; missing: string[] }
  checklist: { ready: boolean; missing: string[] }
  packingList: { ready: boolean; missing: string[] }
  resetChecklist: { ready: boolean; missing: string[] }
  travelRoute: { ready: boolean; missing: string[] }
}

/**
 * Check which documents can be generated for an event
 * Returns readiness status and lists of missing data for each document
 */
export async function getDocumentReadiness(eventId: string): Promise<DocumentReadiness> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event basics
  const { data: event } = await db
    .from('events')
    .select(
      `
      id, serve_time, arrival_time, dietary_restrictions, allergies,
      guest_count, location_address
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!event) {
    return {
      eventSummary: { ready: false, missing: ['Event not found'] },
      groceryList: { ready: false, missing: ['Event not found'] },
      frontOfHouseMenu: { ready: false, missing: ['Event not found'] },
      prepSheet: { ready: false, missing: ['Event not found'] },
      executionSheet: { ready: false, missing: ['Event not found'] },
      checklist: { ready: false, missing: ['Event not found'] },
      packingList: { ready: false, missing: ['Event not found'] },
      resetChecklist: { ready: false, missing: ['Event not found'] },
      travelRoute: { ready: false, missing: ['Event not found'] },
    }
  }

  // Check for menu with dishes and components
  const { data: menus } = await db
    .from('menus')
    .select('id')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .limit(1)

  const hasMenu = menus && menus.length > 0
  let hasDishes = false
  let hasComponents = false

  if (hasMenu) {
    const { count: dishCount } = await db
      .from('dishes')
      .select('id', { count: 'exact', head: true })
      .eq('menu_id', menus[0].id)
      .eq('tenant_id', user.tenantId!)

    hasDishes = (dishCount ?? 0) > 0

    if (hasDishes) {
      const { data: dishes } = await db
        .from('dishes')
        .select('id')
        .eq('menu_id', menus[0].id)
        .eq('tenant_id', user.tenantId!)

      const dishIds = (dishes || []).map((d: any) => d.id)
      if (dishIds.length > 0) {
        const { count: compCount } = await db
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

  // Front-of-house menu needs: menu with dishes
  const fohMissing: string[] = []
  if (!hasMenu) fohMissing.push('Menu not attached to event')
  else if (!hasDishes) fohMissing.push('No dishes in menu')

  // Execution sheet needs: menu + dietary info + serve time
  const execMissing: string[] = [...prepMissing]
  if (!event.serve_time) execMissing.push('Serve time not set')

  // Grocery list: same requirements as prep sheet (needs menu + dishes + components)
  const groceryMissing = [...prepMissing]

  // Travel route: ready when at least one service_travel leg exists
  let hasTravelRoute = false
  try {
    const { count: legCount } = await db
      .from('event_travel_legs')
      .select('id', { count: 'exact', head: true })
      .eq('primary_event_id', eventId)
      .eq('leg_type', 'service_travel')
      .neq('status', 'cancelled')
    hasTravelRoute = (legCount ?? 0) > 0
  } catch {
    // Table may not exist yet (migration pending)
  }

  // Event Summary, checklist, packing list, and reset checklist are always generatable
  return {
    eventSummary: { ready: true, missing: [] },
    groceryList: { ready: groceryMissing.length === 0, missing: groceryMissing },
    frontOfHouseMenu: { ready: fohMissing.length === 0, missing: fohMissing },
    prepSheet: { ready: prepMissing.length === 0, missing: prepMissing },
    executionSheet: { ready: execMissing.length === 0, missing: execMissing },
    checklist: { ready: true, missing: [] },
    packingList: { ready: true, missing: [] },
    resetChecklist: { ready: true, missing: [] },
    travelRoute: {
      ready: hasTravelRoute,
      missing: hasTravelRoute
        ? []
        : ['No service travel leg added yet - open Travel Plan to add one'],
    },
  }
}
