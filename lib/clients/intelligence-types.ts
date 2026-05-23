// lib/clients/intelligence-types.ts
// Types for the Client Intelligence Ledger (CLIENT #5).
// Covers risk scoring, churn prediction, satisfaction trending,
// portal interaction capture, and revenue attribution.

// ---------------------------------------------------------------------------
// Intelligence columns on the clients table
// ---------------------------------------------------------------------------

export interface ClientIntelligenceProfile {
  clientId: string
  tenantId: string
  // Derived/computed fields (stored on clients row)
  riskScore: number | null // 0-100, higher = more at risk
  predictedChurnDate: string | null // ISO date, estimated churn if no action
  satisfactionTrend: SatisfactionTrend | null
  lifetimeValueCents: number // canonical LTV from financial summaries
}

export type SatisfactionTrend = 'improving' | 'stable' | 'declining'

// ---------------------------------------------------------------------------
// Client portal interactions
// ---------------------------------------------------------------------------

export type ClientInteractionType =
  | 'page_view'
  | 'quote_opened'
  | 'quote_accepted'
  | 'quote_declined'
  | 'invoice_viewed'
  | 'invoice_paid'
  | 'menu_approved'
  | 'menu_requested_change'
  | 'message_sent'
  | 'document_downloaded'
  | 'event_confirmed'
  | 'event_cancelled'
  | 'portal_login'
  | 'portal_logout'
  | 'feedback_submitted'
  | 'link_clicked'

export interface ClientPortalInteraction {
  id?: string
  tenantId: string
  clientId: string
  interactionType: ClientInteractionType
  entityType?: string | null // 'event' | 'quote' | 'invoice' | 'menu' | 'message'
  entityId?: string | null // opaque ID (not PII)
  sessionId?: string | null // opaque session ref
  source: string
  durationSeconds?: number | null
  metadata?: Record<string, unknown>
  occurredAt?: string // ISO timestamp, defaults to now()
}

// ---------------------------------------------------------------------------
// Revenue attribution
// ---------------------------------------------------------------------------

export type RevenueAttributionType = 'direct' | 'referral' | 'recurring' | 'upgrade' | 'tip'

export interface ClientRevenueAttribution {
  id?: string
  tenantId: string
  clientId: string
  eventId?: string | null
  attributionType: RevenueAttributionType
  amountCents: number
  currency?: string
  recognizedAt?: string
  notes?: string | null
}

// ---------------------------------------------------------------------------
// Export / PII redaction
// ---------------------------------------------------------------------------

/** Keys that must be redacted when exporting client intelligence data. */
export const INTELLIGENCE_PII_FIELDS: readonly string[] = [
  'email',
  'phone',
  'full_name',
  'preferred_name',
  'session_id',
  'ip_address',
  'user_agent',
] as const

export interface ClientIntelligenceExportRow {
  clientId: string
  // Redacted fields replaced with '[REDACTED]'
  fullName: '[REDACTED]'
  email: '[REDACTED]'
  phone: '[REDACTED]'
  // Safe computed fields
  riskScore: number | null
  satisfactionTrend: SatisfactionTrend | null
  predictedChurnDate: string | null
  lifetimeValueCents: number
  totalInteractions: number
  lastInteractionAt: string | null
  totalRevenueCents: number
}

// ---------------------------------------------------------------------------
// Risk scoring inputs
// ---------------------------------------------------------------------------

export interface RiskScoringInput {
  daysSinceLastEvent: number
  daysSinceLastInteraction: number | null
  lifetimeValueCents: number
  totalEvents: number
  outstandingBalanceCents: number
  satisfactionTrend: SatisfactionTrend | null
  declineCount: number // # of declined quotes in last 90 days
}

/**
 * Deterministic risk score: 0 = safe, 100 = critical churn risk.
 * No external calls. Pure function.
 */
export function computeRiskScore(input: RiskScoringInput): number {
  let score = 0

  // Recency decay: big weight on days since last event
  if (input.daysSinceLastEvent > 365) score += 40
  else if (input.daysSinceLastEvent > 180) score += 25
  else if (input.daysSinceLastEvent > 90) score += 10

  // Portal engagement: if never interacted since last event
  if (input.daysSinceLastInteraction === null || input.daysSinceLastInteraction > 60) score += 15
  else if (input.daysSinceLastInteraction > 30) score += 5

  // Satisfaction signal
  if (input.satisfactionTrend === 'declining') score += 20
  else if (input.satisfactionTrend === 'stable') score += 0
  else if (input.satisfactionTrend === 'improving') score -= 10

  // Declining quote signals
  if (input.declineCount >= 2) score += 15
  else if (input.declineCount >= 1) score += 5

  // Outstanding balance is a risk signal (chef hasn't been paid)
  if (input.outstandingBalanceCents > 50000) score += 10 // >$500 outstanding

  return Math.max(0, Math.min(100, score))
}
