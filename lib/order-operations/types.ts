import type { OrderOpsAdapterMaturity } from './adapters/types'

export type OrderOpsKind = 'order' | 'reservation' | 'waitlist' | 'external_event'
export type OrderOpsLane = 'attention' | 'scheduled' | 'active' | 'ready' | 'done'
export type OrderOpsInteractionMode = 'NATIVE' | 'INTEGRATED' | 'OBSERVED'

export type OrderOpsSource = {
  id: string
  label: string
  category: 'chefflow' | 'pos' | 'reservation' | 'delivery' | 'other'
}

export type OrderOpsItem = {
  id: string
  kind: OrderOpsKind
  source: OrderOpsSource
  interactionMode: OrderOpsInteractionMode
  lane: OrderOpsLane
  status: string
  title: string
  subtitle: string | null
  guestName: string | null
  partySize: number | null
  tableLabel: string | null
  amountCents: number | null
  scheduledAt: string | null
  occurredAt: string | null
  chefFlowHref: string | null
  externalEntityId: string | null
}

export type OrderOpsDebt = {
  id: string
  capability: string
  system: string
  reason: string
  nextStep: string
}

export type OrderOpsMetrics = {
  totalOpen: number
  needsAttention: number
  activeOrders: number
  upcomingReservations: number
  waitingDemand: number
  externalSignals: number
}

export type OrderOpsCoverage = {
  system: string
  category: 'pos' | 'reservation' | 'delivery'
  state: 'configured' | 'available' | 'adapter_required'
  maturity: OrderOpsAdapterMaturity
  requiresPartnerApproval: boolean
  interactionMode: OrderOpsInteractionMode
  detail: string
}

export type OrderOpsSnapshot = {
  generatedAt: string
  items: OrderOpsItem[]
  metrics: OrderOpsMetrics
  coverage: OrderOpsCoverage[]
  debt: OrderOpsDebt[]
}
