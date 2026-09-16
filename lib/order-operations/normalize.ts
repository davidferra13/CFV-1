import { ORDER_OPS_ADAPTER_CATALOG } from './adapters/catalog'
import type {
  OrderOpsCoverage,
  OrderOpsDebt,
  OrderOpsItem,
  OrderOpsLane,
  OrderOpsMetrics,
} from './types'

const POS_PROVIDERS = new Set(['toast', 'square', 'clover', 'lightspeed', 'shopify_pos'])
const RESERVATION_PROVIDERS = new Set(['opentable', 'sevenrooms', 'resy'])
const DELIVERY_PROVIDERS = new Set(['deliverect', 'doordash', 'uber_eats', 'grubhub'])

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }
  return null
}

function firstNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return value
    if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  }
  return null
}

function providerCategory(provider: string): OrderOpsItem['source']['category'] {
  if (POS_PROVIDERS.has(provider)) return 'pos'
  if (RESERVATION_PROVIDERS.has(provider)) return 'reservation'
  if (DELIVERY_PROVIDERS.has(provider)) return 'delivery'
  return 'other'
}

function providerDisplayName(provider: string): string {
  const labels: Record<string, string> = {
    toast: 'Toast', square: 'Square', clover: 'Clover', lightspeed: 'Lightspeed', shopify_pos: 'Shopify POS',
    opentable: 'OpenTable', sevenrooms: 'SevenRooms', resy: 'Resy', deliverect: 'Deliverect',
    doordash: 'DoorDash', uber_eats: 'Uber Eats', grubhub: 'Grubhub',
  }
  return labels[provider] ?? provider.replaceAll('_', ' ')
}

function laneForOrderStatus(status: string): OrderOpsLane {
  if (status === 'ready') return 'ready'
  if (status === 'received' || status === 'preparing') return 'active'
  if (status === 'picked_up' || status === 'completed') return 'done'
  if (status === 'cancelled') return 'done'
  return 'attention'
}

function laneForReservationStatus(status: string, scheduledAt: string | null): OrderOpsLane {
  if (status === 'seated') return 'active'
  if (status === 'completed' || status === 'cancelled' || status === 'no_show') return 'done'
  if (!scheduledAt) return 'attention'
  return 'scheduled'
}

export function normalizeOrderQueueRow(row: Record<string, any>): OrderOpsItem {
  const sales = asRecord(row.sales)
  const status = String(row.status ?? 'received')
  return {
    id: `order:${String(row.id)}`,
    kind: 'order',
    source: { id: 'chefflow', label: 'ChefFlow', category: 'chefflow' },
    interactionMode: 'NATIVE',
    lane: laneForOrderStatus(status),
    status,
    title: row.order_number ? `Order ${row.order_number}` : 'Order',
    subtitle: row.notes ? String(row.notes) : null,
    guestName: row.customer_name ? String(row.customer_name) : null,
    partySize: null,
    tableLabel: null,
    amountCents: firstNumber(sales, ['total_cents', 'totalCents']),
    scheduledAt: row.estimated_ready_at ? String(row.estimated_ready_at) : null,
    occurredAt: row.received_at ? String(row.received_at) : null,
    chefFlowHref: '/commerce/orders',
    externalEntityId: null,
  }
}

export function normalizeReservationRow(row: Record<string, any>): OrderOpsItem {
  const guest = asRecord(row.guests)
  const date = row.reservation_date ? String(row.reservation_date) : ''
  const time = row.reservation_time ? String(row.reservation_time) : '00:00:00'
  const scheduledAt = date ? `${date}T${time}` : null
  const status = String(row.status ?? 'confirmed')
  const guestName = firstString(guest, ['name', 'full_name'])

  return {
    id: `reservation:${String(row.id)}`,
    kind: 'reservation',
    source: { id: 'chefflow', label: 'ChefFlow', category: 'chefflow' },
    interactionMode: 'NATIVE',
    lane: laneForReservationStatus(status, scheduledAt),
    status,
    title: guestName ? `Reservation · ${guestName}` : 'Reservation',
    subtitle: row.notes ? String(row.notes) : null,
    guestName,
    partySize: row.party_size == null ? null : Number(row.party_size),
    tableLabel: row.table_number ? String(row.table_number) : null,
    amountCents: null,
    scheduledAt,
    occurredAt: row.created_at ? String(row.created_at) : null,
    chefFlowHref: '/guests/reservations',
    externalEntityId: null,
  }
}

export function normalizeWaitlistRow(row: Record<string, any>): OrderOpsItem {
  const client = asRecord(row.clients)
  const guestName = firstString(client, ['full_name', 'name'])
  const requestedDate = row.requested_date ? String(row.requested_date) : null
  const status = String(row.status ?? 'waiting')

  return {
    id: `waitlist:${String(row.id)}`,
    kind: 'waitlist',
    source: { id: 'chefflow', label: 'ChefFlow', category: 'chefflow' },
    interactionMode: 'NATIVE',
    lane: status === 'waiting' || status === 'contacted' ? 'attention' : 'done',
    status,
    title: guestName ? `Waitlist · ${guestName}` : 'Waitlist request',
    subtitle: row.occasion ? String(row.occasion) : row.notes ? String(row.notes) : null,
    guestName,
    partySize: row.guest_count_estimate == null ? null : Number(row.guest_count_estimate),
    tableLabel: row.table_id ? String(row.table_id) : null,
    amountCents: null,
    scheduledAt: requestedDate ? `${requestedDate}T00:00:00` : null,
    occurredAt: row.created_at ? String(row.created_at) : null,
    chefFlowHref: '/waitlist',
    externalEntityId: null,
  }
}

export function normalizeIntegrationEvent(row: Record<string, any>): OrderOpsItem {
  const provider = String(row.provider ?? 'external')
  const rawPayload = asRecord(row.raw_payload)
  const normalizedPayload = asRecord(row.normalized_payload)
  const raw = { ...rawPayload, ...normalizedPayload }
  const nested = asRecord(raw.payload)
  const payload = Object.keys(nested).length > 0 ? nested : raw
  const canonicalType = String(row.canonical_event_type ?? '')
  const sourceType = String(row.source_event_type ?? (canonicalType || 'external_event'))
  const status = firstString(payload, ['status', 'state', 'fulfillment_status']) ?? sourceType
  const guestName = firstString(payload, ['guest_name', 'customer_name', 'name'])
  const partySize = firstNumber(payload, ['party_size', 'covers', 'guest_count'])
  const tableLabel = firstString(payload, ['table', 'table_number', 'table_name'])
  const amountCents = firstNumber(payload, ['amount_cents', 'total_cents'])
  const scheduledAt = firstString(payload, ['scheduled_at', 'reservation_time', 'fulfillment_time'])

  const kind = canonicalType.includes('reservation') || sourceType.toLowerCase().includes('reservation')
    ? 'reservation'
    : canonicalType.includes('order') || sourceType.toLowerCase().includes('order')
      ? 'order'
      : 'external_event'

  return {
    id: `external:${String(row.id)}`,
    kind,
    source: { id: provider, label: providerDisplayName(provider), category: providerCategory(provider) },
    interactionMode: 'OBSERVED',
    lane: status.toLowerCase().includes('cancel') || status.toLowerCase().includes('complete')
      ? 'done'
      : scheduledAt
        ? 'scheduled'
        : 'attention',
    status,
    title: guestName ? `${kind === 'reservation' ? 'Reservation' : 'Order'} · ${guestName}` : sourceType,
    subtitle: `Normalized from ${providerDisplayName(provider)}`,
    guestName,
    partySize,
    tableLabel,
    amountCents,
    scheduledAt,
    occurredAt: row.occurred_at ? String(row.occurred_at) : row.received_at ? String(row.received_at) : null,
    chefFlowHref: null,
    externalEntityId: row.external_entity_id ? String(row.external_entity_id) : null,
  }
}
export function buildOrderOpsMetrics(items: OrderOpsItem[]): OrderOpsMetrics {
  const open = items.filter((item) => item.lane !== 'done')
  return {
    totalOpen: open.length,
    needsAttention: open.filter((item) => item.lane === 'attention').length,
    activeOrders: open.filter((item) => item.kind === 'order' && ['active', 'ready'].includes(item.lane)).length,
    upcomingReservations: open.filter((item) => item.kind === 'reservation' && item.lane === 'scheduled').length,
    waitingDemand: open.filter((item) => item.kind === 'waitlist').length,
    externalSignals: open.filter((item) => item.interactionMode !== 'NATIVE').length,
  }
}

const REQUIRED_EXTERNAL_SYSTEMS = ORDER_OPS_ADAPTER_CATALOG

function canonicalProviderLabel(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, '')
}
export function buildOrderOpsCoverage(connectedProviders: string[]): OrderOpsCoverage[] {
  const configured = new Set(connectedProviders.map(canonicalProviderLabel))
  return REQUIRED_EXTERNAL_SYSTEMS.map((entry) => {
    const providerKey = canonicalProviderLabel(entry.provider)
    const isConfigured = configured.has(providerKey)
    const isInCurrentConnectionInventory = ['toast', 'square', 'clover', 'lightspeed'].includes(entry.provider)
    const base = {
      system: entry.label,
      category: entry.category,
      maturity: entry.maturity,
      requiresPartnerApproval: entry.requiresPartnerApproval,
    }

    if (isConfigured) {
      return {
        ...base,
        state: 'configured' as const,
        interactionMode: 'OBSERVED' as const,
        detail: 'A connection record exists, but end-to-end read/write command capability is not yet verified.',
      }
    }

    if (isInCurrentConnectionInventory) {
      return {
        ...base,
        state: 'available' as const,
        interactionMode: 'OBSERVED' as const,
        detail: 'ChefFlow has a connection slot for this provider; tenant setup and command verification are still required.',
      }
    }

    return {
      ...base,
      state: 'adapter_required' as const,
      interactionMode: 'OBSERVED' as const,
      detail: entry.requiresPartnerApproval
        ? 'Provider access or partnership approval and a dedicated ChefFlow adapter are required.'
        : 'Dedicated ChefFlow adapter is not yet implemented.',
    }
  })
}

export function buildOrderOpsDebt(
  items: OrderOpsItem[],
  coverage: OrderOpsCoverage[]
): OrderOpsDebt[] {
  const debt: OrderOpsDebt[] = []
  const observedSources = new Set(
    items.filter((item) => item.interactionMode === 'OBSERVED').map((item) => item.source.label)
  )

  for (const source of observedSources) {
    debt.push({
      id: `write-path:${canonicalProviderLabel(source)}`,
      capability: 'External order/reservation write path',
      system: source,
      reason: 'ChefFlow can observe normalized activity but cannot yet prove the workflow can be completed without leaving ChefFlow.',
      nextStep: 'Implement and verify provider command adapter for accept/update/cancel/status actions.',
    })
  }

  for (const entry of coverage.filter((item) => item.state === 'configured')) {
    debt.push({
      id: `integration-proof:${canonicalProviderLabel(entry.system)}`,
      capability: `${entry.category} command verification`,
      system: entry.system,
      reason: entry.detail,
      nextStep: 'Verify ingest, normalization, and write commands end to end before upgrading this channel beyond OBSERVED.',
    })
  }

  for (const entry of coverage.filter((item) => item.state === 'adapter_required')) {
    debt.push({
      id: `adapter:${canonicalProviderLabel(entry.system)}`,
      capability: `${entry.category} integration`,
      system: entry.system,
      reason: entry.detail,
      nextStep: `Build a normalized ${entry.category} adapter and end-to-end contract tests.`,
    })
  }

  return debt
}
