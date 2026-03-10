// Workflow Server Actions
// Fetches data and feeds it to the pure preparable-actions engine.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import type { DashboardWorkSurface, EventContext } from './types'
import { getPreparableActions } from './preparable-actions'

function emptyShoppingState(): EventContext['shopping'] {
  return {
    activeListId: null,
    hasActiveList: false,
    completedListCount: 0,
    lastCompletedAt: null,
  }
}

/**
 * Fetch all active event contexts for the current chef's tenant,
 * then run getPreparableActions on them.
 */
export async function getDashboardWorkSurface(): Promise<DashboardWorkSurface> {
  const user = await requireChef()
  const supabase: any = createServerClient()

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

  const eventIds = events.map((event: any) => event.id)

  const [menusResult, financialsResult, shoppingListsResult, packingConfirmationsResult] =
    await Promise.all([
      supabase.from('menus').select('id, name, status, event_id').in('event_id', eventIds),
      supabase.from('event_financial_summary').select('*').in('event_id', eventIds),
      supabase
        .from('shopping_lists' as any)
        .select('id, event_id, status, completed_at, updated_at')
        .eq('chef_id', user.tenantId!)
        .in('event_id', eventIds)
        .order('updated_at', { ascending: false }),
      supabase
        .from('packing_confirmations' as any)
        .select('event_id')
        .eq('tenant_id', user.tenantId!)
        .in('event_id', eventIds),
    ])

  const menus = menusResult.data ?? []
  const financials = financialsResult.data ?? []
  const shoppingLists = shoppingListsResult.data ?? []
  const packingConfirmations = packingConfirmationsResult.data ?? []

  const menuIds = menus.map((menu: any) => menu.id)
  const dishCountsByMenu = new Map<string, number>()

  if (menuIds.length > 0) {
    const { data: dishes } = await supabase.from('dishes').select('menu_id').in('menu_id', menuIds)

    if (dishes) {
      for (const dish of dishes) {
        dishCountsByMenu.set(dish.menu_id, (dishCountsByMenu.get(dish.menu_id) || 0) + 1)
      }
    }
  }

  const menusByEvent = new Map<string, EventContext['menus']>()
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

  const financialByEvent = new Map<string, EventContext['financial']>()
  for (const financial of financials) {
    if (!financial.event_id) continue
    financialByEvent.set(financial.event_id, {
      totalPaidCents: financial.total_paid_cents ?? 0,
      outstandingBalanceCents: financial.outstanding_balance_cents ?? 0,
      paymentStatus: financial.payment_status,
    })
  }

  const shoppingByEvent = new Map<string, EventContext['shopping']>()
  for (const list of shoppingLists) {
    if (!list.event_id) continue
    const current = shoppingByEvent.get(list.event_id) ?? emptyShoppingState()

    if (list.status === 'active' && current.activeListId == null) {
      current.activeListId = list.id
      current.hasActiveList = true
    }

    if (list.status === 'completed') {
      current.completedListCount += 1

      if (
        list.completed_at &&
        (!current.lastCompletedAt ||
          new Date(list.completed_at).getTime() > new Date(current.lastCompletedAt).getTime())
      ) {
        current.lastCompletedAt = list.completed_at
      }
    }

    shoppingByEvent.set(list.event_id, current)
  }

  const packingByEvent = new Map<string, EventContext['packing']>()
  for (const confirmation of packingConfirmations) {
    const current = packingByEvent.get(confirmation.event_id) ?? { confirmedItemCount: 0 }
    current.confirmedItemCount += 1
    packingByEvent.set(confirmation.event_id, current)
  }

  const travelByEvent = new Map<string, EventContext['travel']>()
  try {
    const { data: travelLegs } = await supabase
      .from('event_travel_legs' as any)
      .select('primary_event_id')
      .in('primary_event_id', eventIds)
      .eq('leg_type', 'service_travel')
      .neq('status', 'cancelled')

    for (const leg of travelLegs ?? []) {
      if (!leg.primary_event_id) continue
      travelByEvent.set(leg.primary_event_id, { hasServiceTravelRoute: true })
    }
  } catch {
    // This table can be absent in environments that have not applied the travel migration yet.
  }

  const contexts: EventContext[] = events.map((event: any) => ({
    event: {
      id: event.id,
      occasion: event.occasion,
      event_date: event.event_date,
      guest_count: event.guest_count ?? 0,
      location_address: event.location_address,
      special_requests: event.special_requests,
      quoted_price_cents: event.quoted_price_cents,
      deposit_amount_cents: event.deposit_amount_cents,
      serve_time: event.serve_time,
      status: event.status,
      client: event.client as EventContext['event']['client'],
    },
    ops: {
      groceryListReady: event.grocery_list_ready ?? false,
      prepListReady: event.prep_list_ready ?? false,
      equipmentListReady: event.equipment_list_ready ?? false,
      packingListReady: event.packing_list_ready ?? false,
      timelineReady: event.timeline_ready ?? false,
      executionSheetReady: event.execution_sheet_ready ?? false,
      nonNegotiablesChecked: event.non_negotiables_checked ?? false,
      shoppingCompletedAt: event.shopping_completed_at ?? null,
      prepCompletedAt: event.prep_completed_at ?? null,
      carPacked: event.car_packed ?? false,
      carPackedAt: event.car_packed_at ?? null,
    },
    menus: menusByEvent.get(event.id) || [],
    shopping: shoppingByEvent.get(event.id) ?? emptyShoppingState(),
    packing: packingByEvent.get(event.id) ?? { confirmedItemCount: 0 },
    travel: travelByEvent.get(event.id) ?? { hasServiceTravelRoute: false },
    financial: financialByEvent.get(event.id) || null,
  }))

  return getPreparableActions(contexts)
}
