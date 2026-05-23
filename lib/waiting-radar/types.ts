// Waiting State Radar - Type System
// Pure types. No server directive. No side effects.

/** Who or what the item is waiting on */
export type WaitingOn =
  | 'client'
  | 'chef'
  | 'vendor'
  | 'staff'
  | 'system'
  | 'time'
  | 'decision'
  | 'payment'
  | 'unknown'

/** Where the waiting item originates */
export type WaitingSourceKind =
  | 'inquiry'
  | 'quote'
  | 'task'
  | 'payment'
  | 'vendor'
  | 'import'
  | 'client'
  | 'event'
  | 'system'
  | 'contract'
  | 'reminder'

/** Risk level for triage */
export type WaitingRiskLevel = 'low' | 'medium' | 'high' | 'critical'

/** Single waiting item in the radar */
export interface WaitingItem {
  /** Stable derived ID: sourceKind:sourceId */
  id: string
  /** Which domain this comes from */
  sourceKind: WaitingSourceKind
  /** Who or what we are waiting on */
  waitingOn: WaitingOn
  /** Short display title */
  title: string
  /** Short human-readable reason */
  waitingReason: string
  /** When follow-up becomes appropriate (ISO string, null if no date set) */
  followUpAt: string | null
  /** Route to the source record */
  proofHref: string
  /** Risk assessment */
  riskLevel: WaitingRiskLevel
  /** When this waiting state started (ISO string) */
  waitingSince: string
  /** Optional: revenue tied to this item in cents */
  revenueCents: number | null
  /** Optional: associated client name */
  clientName: string | null
  /** Optional: associated event name */
  eventName: string | null
}

/** Summary counts for dashboard panel */
export interface WaitingRadarSummary {
  total: number
  overdue: number
  dueSoon: number
  waitingOnClient: number
  waitingOnChef: number
  waitingOnSystem: number
  waitingOnVendor: number
  waitingOnPayment: number
}

/** Full radar result */
export interface WaitingRadarResult {
  items: WaitingItem[]
  summary: WaitingRadarSummary
  computedAt: string
}

/** Compatibility alias for existing rail resolver */
export type WaitingRadarItem = WaitingItem
