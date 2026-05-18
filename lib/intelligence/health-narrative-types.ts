// Business Health Narrative Dashboard - Types
// AI-generated narrative summary of business health using existing intelligence engines.
// Ollama (Gemma 4) for natural language; template fallback when unavailable.

// ── Snapshot: raw metrics aggregated from real data ─────────────────────────

export interface RevenueSnapshot {
  totalCents: number
  periodLabel: string
  trend: 'up' | 'flat' | 'down'
  comparisonCents: number | null // previous period for delta
  comparisonLabel: string | null
  eventCount: number
  avgPerEventCents: number
}

export interface ClientPipelineSnapshot {
  active: number
  newThisPeriod: number
  atRisk: number
  pipeline: number // open inquiries
  repeatRate: number // percentage
}

export interface EventLoadSnapshot {
  upcoming: number
  completedThisPeriod: number
  cancelledThisPeriod: number
  cancelRate: number // percentage
  avgGuestCount: number
}

export interface CostSnapshot {
  ingredientTotalCents: number
  trend: 'up' | 'flat' | 'down'
  topCategories: { name: string; totalCents: number }[]
}

export interface BusinessHealthSnapshot {
  revenue: RevenueSnapshot
  clients: ClientPipelineSnapshot
  events: EventLoadSnapshot
  costs: CostSnapshot
  generatedAt: string
  periodDays: number
}

// ── Narrative: snapshot + AI-generated or template text ──────────────────────

export type NarrativeSentiment = 'positive' | 'neutral' | 'warning' | 'critical'

export interface NarrativeSection {
  title: string
  content: string
  sentiment: NarrativeSentiment
  metrics: { label: string; value: string }[]
}

export type NarrativeSource = 'ollama' | 'template'

export interface HealthNarrative {
  snapshot: BusinessHealthSnapshot
  sections: NarrativeSection[]
  generatedText: string
  generatedAt: string
  source: NarrativeSource
  confidence: number // 0-1, higher = more data available
}

// ── Trends ──────────────────────────────────────────────────────────────────

export interface TrendPoint {
  label: string // e.g. "May 2026", "Week 20"
  revenueCents: number
  eventCount: number
  clientCount: number
}

export interface HealthTrends {
  period: 'week' | 'month' | 'quarter'
  points: TrendPoint[]
  generatedAt: string
}

// ── Alerts ──────────────────────────────────────────────────────────────────

export interface HealthAlert {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  detail: string
  metric: string
  threshold: string
  currentValue: string
}

// ── Action result ───────────────────────────────────────────────────────────

export interface HealthActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
