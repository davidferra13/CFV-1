export const CHEF_LIFE_SYNTHESIS_DOMAINS = [
  'capacity',
  'compliance',
  'event_readiness',
  'financial_pressure',
  'crisis_recovery',
  'vendor_risk',
  'household_unknowns',
  'strategy_misalignment',
] as const

export type ChefLifeSynthesisDomain = (typeof CHEF_LIFE_SYNTHESIS_DOMAINS)[number]

export type ChefLifeSynthesisUrgency = 'critical' | 'high' | 'watch' | 'calm'
export type ChefLifeSynthesisHorizon = 'today' | 'this_week'

export type ChefLifeSynthesisSignal = {
  domain: ChefLifeSynthesisDomain
  title: string
  detail: string
  urgency: ChefLifeSynthesisUrgency
  href: string
  sourceLabel: string
  sourceHref: string
  sourceUpdatedAt: string | null
  dueAt: string | null
  includeReason: string
  exclusionReason: string
}

export type ChefLifeSynthesisItem = ChefLifeSynthesisSignal & {
  horizon: ChefLifeSynthesisHorizon
  controls: {
    snoozeUntil: 'tomorrow' | 'next_week'
    ignoreUntil: 'source_changes'
    duplicatePolicy: 'one_item_per_domain'
  }
}

export type ChefLifeSynthesisExcludedSignal = ChefLifeSynthesisSignal & {
  reason: string
}

export type ChefLifeDashboardSynthesis = {
  generatedAt: string
  summary: string
  items: ChefLifeSynthesisItem[]
  excluded: ChefLifeSynthesisExcludedSignal[]
  rules: {
    inclusion: string[]
    exclusion: string[]
    duplicatePolicy: string
  }
}

const URGENCY_RANK: Record<ChefLifeSynthesisUrgency, number> = {
  calm: 0,
  watch: 1,
  high: 2,
  critical: 3,
}

const DOMAIN_ORDER: Record<ChefLifeSynthesisDomain, number> = {
  compliance: 0,
  crisis_recovery: 1,
  event_readiness: 2,
  capacity: 3,
  financial_pressure: 4,
  household_unknowns: 5,
  vendor_risk: 6,
  strategy_misalignment: 7,
}

export function buildChefLifeDashboardSynthesis(
  signals: ChefLifeSynthesisSignal[],
  options: { now?: Date; maxItems?: number } = {}
): ChefLifeDashboardSynthesis {
  const now = options.now ?? new Date()
  const maxItems = options.maxItems ?? 6
  const generatedAt = now.toISOString()
  const candidates: ChefLifeSynthesisItem[] = []
  const excluded: ChefLifeSynthesisExcludedSignal[] = []

  for (const signal of signals) {
    const horizon = classifyHorizon(signal, now)
    if (!horizon) {
      excluded.push({ ...signal, reason: signal.exclusionReason })
      continue
    }
    candidates.push({
      ...signal,
      horizon,
      controls: {
        snoozeUntil: horizon === 'today' ? 'tomorrow' : 'next_week',
        ignoreUntil: 'source_changes',
        duplicatePolicy: 'one_item_per_domain',
      },
    })
  }

  const byDomain = new Map<ChefLifeSynthesisDomain, ChefLifeSynthesisItem>()
  for (const item of sortItems(candidates)) {
    if (!byDomain.has(item.domain)) {
      byDomain.set(item.domain, item)
      continue
    }
    excluded.push({
      ...item,
      reason: 'A stronger signal from this owning domain is already included.',
    })
  }

  const items = sortItems(Array.from(byDomain.values())).slice(0, maxItems)
  const includedIds = new Set(items.map((item) => `${item.domain}:${item.title}:${item.href}`))
  for (const item of byDomain.values()) {
    if (!includedIds.has(`${item.domain}:${item.title}:${item.href}`)) {
      excluded.push({
        ...item,
        reason: 'Lower ranked than the calm dashboard limit.',
      })
    }
  }

  return {
    generatedAt,
    summary: summarizeItems(items),
    items,
    excluded,
    rules: {
      inclusion: [
        'Include signals due today, changed today, due this week, or raised to high/critical urgency this week.',
        'Prefer owning surfaces that can resolve the signal instead of duplicating existing dashboard widgets.',
        'Rank by urgency, today before this week, then stable Chef Life domain order.',
      ],
      exclusion: [
        'Exclude calm or watch signals with no today/this-week due date and no source change in the current week.',
        'Exclude weaker duplicates from the same owning domain.',
        'Exclude overflow beyond the rail limit so the dashboard stays calm.',
      ],
      duplicatePolicy: 'At most one included item per Chef Life domain.',
    },
  }
}

function classifyHorizon(
  signal: ChefLifeSynthesisSignal,
  now: Date
): ChefLifeSynthesisHorizon | null {
  const dueDays = daysUntil(signal.dueAt, now)
  const changedDays = daysSince(signal.sourceUpdatedAt, now)
  const urgent = signal.urgency === 'critical' || signal.urgency === 'high'

  if (dueDays !== null && dueDays <= 0) return 'today'
  if (changedDays !== null && changedDays === 0) return 'today'
  if (dueDays !== null && dueDays <= 7) return 'this_week'
  if (urgent && changedDays !== null && changedDays <= 7) return 'this_week'
  return null
}

function sortItems(items: ChefLifeSynthesisItem[]): ChefLifeSynthesisItem[] {
  return [...items].sort((a, b) => {
    const urgency = URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency]
    if (urgency !== 0) return urgency
    const horizon = horizonRank(a.horizon) - horizonRank(b.horizon)
    if (horizon !== 0) return horizon
    return DOMAIN_ORDER[a.domain] - DOMAIN_ORDER[b.domain]
  })
}

function horizonRank(horizon: ChefLifeSynthesisHorizon): number {
  return horizon === 'today' ? 0 : 1
}

function summarizeItems(items: ChefLifeSynthesisItem[]): string {
  if (items.length === 0) {
    return 'No Chef Life signals need dashboard attention today or this week.'
  }
  const critical = items.filter((item) => item.urgency === 'critical').length
  const today = items.filter((item) => item.horizon === 'today').length
  const signalText = `${items.length} Chef Life signal${items.length === 1 ? '' : 's'}`
  const todayText = today > 0 ? `${today} today` : 'none due today'
  const criticalText = critical > 0 ? `${critical} critical` : 'no critical'
  return `${signalText}: ${todayText}, ${criticalText}.`
}

function daysUntil(value: string | null, now: Date): number | null {
  const date = parseDateOnly(value)
  if (!date) return null
  const today = startOfDay(now)
  return Math.floor((date.getTime() - today.getTime()) / 86_400_000)
}

function daysSince(value: string | null, now: Date): number | null {
  const date = parseDateOnly(value)
  if (!date) return null
  const today = startOfDay(now)
  return Math.floor((today.getTime() - date.getTime()) / 86_400_000)
}

function parseDateOnly(value: string | null): Date | null {
  if (!value) return null
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}
