/**
 * Crisis Protocol / Bus-Factor Delegation types (P79).
 * Pre-written plans for when a chef is incapacitated.
 */

export interface CrisisProtocol {
  id: string
  tenantId: string
  protocolData: CrisisProtocolData
  lastReviewedAt: Date | null
  testedAt: Date | null
  createdAt: Date
}

export interface CrisisProtocolData {
  /** Who gets notified and how */
  clientNotifications: ClientNotificationPlan[]
  /** Events to cancel vs reschedule */
  eventDispositions: EventDisposition[]
  /** Trusted contacts who can access accounts/kitchen/supplies */
  accessDelegates: AccessDelegate[]
  /** Free-form notes (insurance info, passwords location, etc.) */
  emergencyNotes: string | null
  /** Chef's preferred communication if partially available */
  chefContactMethod: string | null
}

export interface ClientNotificationPlan {
  clientId: string
  clientName: string
  priority: 'immediate' | 'within_24h' | 'within_week'
  method: 'email' | 'phone' | 'text' | 'portal'
  customMessage: string | null
}

export interface EventDisposition {
  eventId: string
  eventName: string
  eventDate: string
  action: 'cancel' | 'reschedule' | 'delegate_to_sous' | 'defer_decision'
  delegateTo: string | null
  notes: string | null
}

export interface AccessDelegate {
  name: string
  phone: string | null
  email: string | null
  role: 'sous_chef' | 'partner' | 'family' | 'assistant' | 'other'
  accessScope: AccessScope[]
}

export type AccessScope =
  | 'kitchen_keys'
  | 'supplier_accounts'
  | 'client_contacts'
  | 'financial_records'
  | 'equipment_storage'
  | 'vehicle'
  | 'chefflow_account'

export interface CrisisSimulationResult {
  protocolId: string
  simulatedAt: Date
  gaps: CrisisGap[]
  coveragePercent: number
  summary: string
}

export interface CrisisGap {
  area: string
  severity: 'critical' | 'warning' | 'info'
  description: string
  suggestion: string
}
