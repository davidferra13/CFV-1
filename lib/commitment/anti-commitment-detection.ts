import { createServerClient } from '@/lib/db/server'
import type { CommitmentDomain, CommitmentSuggestion } from './types'
import { DOMAIN_LABELS } from './types'

// #39 Anti-Commitment Detection
// Detects chefs with NO commitments exhibiting erratic behavior.
// "Your quotes range $60-$200. Want a floor?"

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10)
}

export interface VolatileArea {
  domain: CommitmentDomain
  label: string
  metric: string
  variance: number
  description: string
}

export interface ErraticBehaviorReport {
  tenantId: string
  hasCommitments: boolean
  volatilityScore: number
  volatileAreas: VolatileArea[]
  suggestedCommitments: CommitmentSuggestion[]
  analyzedAt: Date
}

async function analyzeQuoteVolatility(
  tenantId: string,
  client: any
): Promise<VolatileArea | null> {
  const { data: quotes } = await client
    .from('quotes' as any)
    .select('per_head_price, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (!quotes || quotes.length < 3) return null

  const prices = quotes.map((q: any) => Number(q.per_head_price)).filter((p: number) => p > 0)
  if (prices.length < 3) return null

  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length
  const range = max - min
  const variance = avg > 0 ? range / avg : 0

  if (variance < 0.4) return null

  return {
    domain: 'pricing',
    label: DOMAIN_LABELS.pricing,
    metric: 'per-head price range',
    variance: Math.round(variance * 100) / 100,
    description: 'Quotes range from $' + min.toFixed(0) + ' to $' + max.toFixed(0) + ' per head (avg $' + avg.toFixed(0) + '). A pricing floor could stabilize margins.',
  }
}

async function analyzeSchedulingVolatility(
  tenantId: string,
  client: any
): Promise<VolatileArea | null> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
  const { data: events } = await client
    .from('events' as any)
    .select('date, created_at')
    .eq('tenant_id', tenantId)
    .gte('date', ninetyDaysAgo.toISOString())
    .order('date', { ascending: true })
    .limit(50)

  if (!events || events.length < 4) return null

  const dates = events.map((e: any) => new Date(e.date).getTime())
  const gaps: number[] = []
  for (let i = 1; i < dates.length; i++) {
    gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24))
  }

  if (gaps.length < 2) return null

  const avgGap = gaps.reduce((a: number, b: number) => a + b, 0) / gaps.length
  const gapVariance =
    gaps.reduce((sum: number, g: number) => sum + Math.pow(g - avgGap, 2), 0) / gaps.length
  const stdDev = Math.sqrt(gapVariance)
  const cv = avgGap > 0 ? stdDev / avgGap : 0

  if (cv < 0.8) return null

  return {
    domain: 'scheduling',
    label: DOMAIN_LABELS.scheduling,
    metric: 'event spacing consistency',
    variance: Math.round(cv * 100) / 100,
    description: 'Event scheduling is highly irregular (' + Math.round(stdDev) + ' day standard deviation). A weekly event cap could create more predictable flow.',
  }
}

async function analyzeCommunicationGaps(
  tenantId: string,
  client: any
): Promise<VolatileArea | null> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  const { data: comms } = await client
    .from('communications' as any)
    .select('created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', ninetyDaysAgo.toISOString())
    .order('created_at', { ascending: true })
    .limit(100)

  if (!comms || comms.length < 5) return null

  const dates = comms.map((c: any) => new Date(c.created_at).getTime())
  const gaps: number[] = []
  for (let i = 1; i < dates.length; i++) {
    gaps.push((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24))
  }

  const maxGap = Math.max(...gaps)
  const avgGap = gaps.reduce((a: number, b: number) => a + b, 0) / gaps.length

  if (maxGap < 7 || maxGap / avgGap < 3) return null

  return {
    domain: 'communication',
    label: DOMAIN_LABELS.communication,
    metric: 'response consistency',
    variance: Math.round((maxGap / avgGap) * 100) / 100,
    description: 'Communication gaps up to ' + Math.round(maxGap) + ' days, then bursts of activity. A response SLA could prevent client anxiety.',
  }
}

function buildSuggestions(
  tenantId: string,
  areas: VolatileArea[]
): CommitmentSuggestion[] {
  const suggestions: CommitmentSuggestion[] = []

  for (const area of areas) {
    if (area.domain === 'pricing') {
      suggestions.push({
        id: generateId(),
        tenantId,
        domain: 'pricing',
        suggestedRule: { type: 'pricing_floor', minPerHead: 0 },
        rationale: area.description,
        evidence: { variance: area.variance, metric: area.metric },
        status: 'pending',
        respondedAt: null,
        dismissedReason: null,
        createdAt: new Date(),
      })
    } else if (area.domain === 'scheduling') {
      suggestions.push({
        id: generateId(),
        tenantId,
        domain: 'scheduling',
        suggestedRule: { type: 'max_events_per_week', limit: 5 },
        rationale: area.description,
        evidence: { variance: area.variance, metric: area.metric },
        status: 'pending',
        respondedAt: null,
        dismissedReason: null,
        createdAt: new Date(),
      })
    } else if (area.domain === 'communication') {
      suggestions.push({
        id: generateId(),
        tenantId,
        domain: 'communication',
        suggestedRule: { type: 'no_radio_silence', maxDays: 5 },
        rationale: area.description,
        evidence: { variance: area.variance, metric: area.metric },
        status: 'pending',
        respondedAt: null,
        dismissedReason: null,
        createdAt: new Date(),
      })
    }
  }

  return suggestions
}

export async function detectErraticBehavior(
  tenantId: string
): Promise<ErraticBehaviorReport> {
  const client = createServerClient()

  const { data: existing } = await client
    .from('commitments' as any)
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .limit(1)

  const hasCommitments = (existing && existing.length > 0) || false

  const [quoteArea, schedArea, commArea] = await Promise.all([
    analyzeQuoteVolatility(tenantId, client),
    analyzeSchedulingVolatility(tenantId, client),
    analyzeCommunicationGaps(tenantId, client),
  ])

  const volatileAreas: VolatileArea[] = []
  if (quoteArea) volatileAreas.push(quoteArea)
  if (schedArea) volatileAreas.push(schedArea)
  if (commArea) volatileAreas.push(commArea)

  const maxPossible = 3
  const rawScore = volatileAreas.reduce((sum: number, a: VolatileArea) => sum + Math.min(a.variance, 2), 0)
  const volatilityScore = Math.round(Math.min((rawScore / (maxPossible * 2)) * 100, 100))

  const suggestedCommitments = hasCommitments ? [] : buildSuggestions(tenantId, volatileAreas)

  return {
    tenantId,
    hasCommitments,
    volatilityScore,
    volatileAreas,
    suggestedCommitments,
    analyzedAt: new Date(),
  }
}