// Workflow Server Actions
// Fetches data and feeds it to the pure preparable-actions engine.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import type { EventContext, DashboardWorkSurface } from './types'
import { getPreparableActions } from './preparable-actions'

/**
 * Fetch all active event contexts for the current chef's tenant,
 * then run GET_PREPARABLE_ACTIONS on them.
 */
export async function getDashboardWorkSurface(): Promise<DashboardWorkSurface> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Fetch events with client data
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select(
      `
      *,
      client:clients(id, full_name, email)
    `
    )
    .eq('tenant_id', user.tenantId!)
    .order('event_date', { ascending: true })

  if (eventsError) {
    console.error('[getDashboardWorkSurface] Events error:', eventsError)
    throw new Error('Failed to fetch events')
  }

  if (!events || events.length === 0) {
    return getPreparableActions([])
  }

  // Fetch menus for all events via menus.event_id FK
  const eventIds = events.map((e) => e.id)

  const { data: menus } = await supabase
    .from('menus')
    .select('id, name, status, event_id')
    .in('event_id', eventIds)

  // Fetch dish counts per menu in one query
  const menuIds = (menus || []).map((m) => m.id)
  const dishCountsByMenu = new Map<string, number>()

  if (menuIds.length > 0) {
    const { data: dishes } = await supabase.from('dishes').select('menu_id').in('menu_id', menuIds)

    if (dishes) {
      for (const dish of dishes) {
        dishCountsByMenu.set(dish.menu_id, (dishCountsByMenu.get(dish.menu_id) || 0) + 1)
      }
    }
  }

  // Fetch financial summaries for all events in one query
  const { data: financials } = await supabase
    .from('event_financial_summary')
    .select('*')
    .in('event_id', eventIds)

  // Build lookup maps
  const menusByEvent = new Map<string, EventContext['menus']>()
  if (menus) {
    for (const menu of menus) {
      if (!menu.event_id) continue
      const existing = menusByEvent.get(menu.event_id) || []
      existing.push({
        id: menu.id,
        name: menu.name,
        status: menu.status,
        dishCount: dishCountsByMenu.get(menu.id) || 0,
      })
      menusByEvent.set(menu.event_id, existing)
    }
  }

  const financialByEvent = new Map<string, EventContext['financial']>()
  if (financials) {
    for (const f of financials) {
      if (f.event_id) {
        financialByEvent.set(f.event_id, {
          totalPaidCents: f.total_paid_cents ?? 0,
          outstandingBalanceCents: f.outstanding_balance_cents ?? 0,
          paymentStatus: f.payment_status,
        })
      }
    }
  }

  // Assemble contexts
  const contexts: EventContext[] = events.map((event) => ({
    event: {
      id: event.id,
      occasion: event.occasion,
      event_date: event.event_date,
      guest_count: event.guest_count,
      location_address: event.location_address,
      special_requests: event.special_requests,
      quoted_price_cents: event.quoted_price_cents,
      deposit_amount_cents: event.deposit_amount_cents,
      serve_time: event.serve_time,
      status: event.status,
      client: event.client as EventContext['event']['client'],
    },
    menus: menusByEvent.get(event.id) || [],
    financial: financialByEvent.get(event.id) || null,
  }))

  return getPreparableActions(contexts)
}
