'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import {
  buildOrderOpsCoverage,
  buildOrderOpsDebt,
  buildOrderOpsMetrics,
  normalizeIntegrationEvent,
  normalizeOrderQueueRow,
  normalizeReservationRow,
  normalizeWaitlistRow,
} from './normalize'
import type { OrderOpsItem, OrderOpsSnapshot } from './types'

const LANE_ORDER: Record<OrderOpsItem['lane'], number> = {
  attention: 0,
  active: 1,
  ready: 2,
  scheduled: 3,
  done: 4,
}

function todayDateString() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
function sortItems(items: OrderOpsItem[]) {
  return [...items].sort((a, b) => {
    const laneDelta = LANE_ORDER[a.lane] - LANE_ORDER[b.lane]
    if (laneDelta !== 0) return laneDelta
    const aTime = a.scheduledAt ?? a.occurredAt ?? '9999-12-31T23:59:59'
    const bTime = b.scheduledAt ?? b.occurredAt ?? '9999-12-31T23:59:59'
    return aTime.localeCompare(bTime)
  })
}

function isOrderOpsExternalEvent(row: Record<string, any>) {
  const canonical = String(row.canonical_event_type ?? '').toLowerCase()
  const source = String(row.source_event_type ?? '').toLowerCase()
  return [canonical, source].some((value) =>
    ['order', 'reservation', 'booking', 'delivery', 'fulfillment'].some((needle) => value.includes(needle))
  )
}

export async function getOrderOpsSnapshot(): Promise<OrderOpsSnapshot> {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()
  const today = todayDateString()

  const [ordersRes, reservationsRes, waitlistRes, eventsRes, connectionsRes] = await Promise.all([
    db.from('order_queue' as any)
      .select('*, sales!inner(sale_number, total_cents, client_id)')
      .eq('tenant_id', user.tenantId!)
      .in('status', ['received', 'preparing', 'ready'])
      .order('received_at', { ascending: true })
      .limit(100),
    db.from('guest_reservations' as any)
      .select('*, guests(id, name, phone)')
      .eq('chef_id', user.tenantId!)
      .gte('reservation_date', today)
      .in('status', ['confirmed', 'seated'])
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true })
      .limit(100),
    db.from('waitlist_entries' as any)
      .select('*, clients(id, full_name)')
      .eq('chef_id', user.tenantId!)
      .in('status', ['waiting', 'contacted'])
      .order('requested_date', { ascending: true })
      .order('position', { ascending: true })
      .limit(100),
    db.from('integration_events' as any)
      .select('id, provider, source_event_type, canonical_event_type, external_entity_id, occurred_at, received_at, raw_payload, normalized_payload, status')
      .eq('tenant_id', user.tenantId!)
      .in('status', ['completed', 'pending', 'processing'])
      .order('received_at', { ascending: false })
      .limit(100),
    db.from('integration_connections' as any)
      .select('provider, status')
      .eq('tenant_id', user.tenantId!)
      .eq('status', 'connected'),
  ])

  const failures = [
    ['orders', ordersRes.error],
    ['reservations', reservationsRes.error],
    ['waitlist', waitlistRes.error],
    ['integration events', eventsRes.error],
    ['integration connections', connectionsRes.error],
  ].filter(([, error]) => Boolean(error))

  if (failures.length > 0) {
    const message = failures
      .map(([label, error]) => `${label}: ${(error as { message?: string })?.message ?? 'unknown error'}`)
      .join('; ')
    throw new Error(`Failed to build Order Operations snapshot: ${message}`)
  }

  const items = sortItems([
    ...((ordersRes.data ?? []) as Record<string, any>[]).map(normalizeOrderQueueRow),
    ...((reservationsRes.data ?? []) as Record<string, any>[]).map(normalizeReservationRow),
    ...((waitlistRes.data ?? []) as Record<string, any>[]).map(normalizeWaitlistRow),
    ...((eventsRes.data ?? []) as Record<string, any>[])
      .filter(isOrderOpsExternalEvent)
      .map(normalizeIntegrationEvent),
  ])

  const connectedProviders = ((connectionsRes.data ?? []) as Array<{ provider: string }>).map(
    (row) => String(row.provider)
  )
  const coverage = buildOrderOpsCoverage(connectedProviders)

  return {
    generatedAt: new Date().toISOString(),
    items,
    metrics: buildOrderOpsMetrics(items),
    coverage,
    debt: buildOrderOpsDebt(items, coverage),
  }
}
