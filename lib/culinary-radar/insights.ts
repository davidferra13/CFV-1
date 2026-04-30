import type {
  RadarCategory,
  RadarLoadResult,
  RadarMatchView,
  RadarSeverity,
  RadarSourceSummary,
} from './view-model'

export type RadarSourceHealth = 'healthy' | 'stale' | 'degraded' | 'unverified'

export type RadarActionLaneKey =
  | 'safety_impact'
  | 'local_sourcing'
  | 'opportunity_inbox'
  | 'sustainability_brief'

export type RadarActionLane = {
  key: RadarActionLaneKey
  label: string
  description: string
  matches: RadarMatchView[]
  nextStep: string
}

export type RadarSourceTrustView = RadarSourceSummary & {
  health: RadarSourceHealth
  freshnessLabel: string
}

export type RadarInsightSummary = {
  lanes: RadarActionLane[]
  sourceTrust: RadarSourceTrustView[]
  staleSourceCount: number
  degradedSourceCount: number
  trustedSourceCount: number
}

const STALE_AFTER_HOURS = 36

export function buildRadarInsightSummary(overview: RadarLoadResult): RadarInsightSummary {
  const lanes: RadarActionLane[] = [
    buildLane(
      'safety_impact',
      'Safety impact map',
      'Recalls, outbreaks, and safety items that may require inventory, vendor, or event review.',
      overview.matches.filter((match) => match.item.category === 'safety'),
      'Create a task, check matched entities, then open the official source.'
    ),
    buildLane(
      'local_sourcing',
      'Local market finder',
      'Farmers market and local sourcing signals that can become vendor leads, sourcing tasks, or calendar notes.',
      overview.matches.filter((match) => match.item.category === 'local'),
      'Open the official source, search by ZIP or event city, then save the lead if relevant.'
    ),
    buildLane(
      'opportunity_inbox',
      'Opportunity inbox',
      'Relief, charity, training, career, and industry opportunities that may deserve follow-up.',
      overview.matches.filter((match) => match.item.category === 'opportunity'),
      'Create a review task before any deadline or application window closes.'
    ),
    buildLane(
      'sustainability_brief',
      'Sustainability operator brief',
      'Source-backed sustainability guidance that can improve sourcing, waste, packaging, and operations.',
      overview.matches.filter((match) => match.item.category === 'sustainability'),
      'Save practical guidance into operating notes or create a follow-up task.'
    ),
  ]

  const sourceTrust = overview.sources.map(toSourceTrustView)

  return {
    lanes,
    sourceTrust,
    staleSourceCount: sourceTrust.filter((source) => source.health === 'stale').length,
    degradedSourceCount: sourceTrust.filter((source) => source.health === 'degraded').length,
    trustedSourceCount: sourceTrust.filter((source) => source.health === 'healthy').length,
  }
}

export function topRadarMatches(
  matches: RadarMatchView[],
  limit = 3,
  category?: RadarCategory
): RadarMatchView[] {
  return matches
    .filter((match) => !category || match.item.category === category)
    .sort(compareRadarMatches)
    .slice(0, Math.max(0, limit))
}

function buildLane(
  key: RadarActionLaneKey,
  label: string,
  description: string,
  matches: RadarMatchView[],
  nextStep: string
): RadarActionLane {
  return {
    key,
    label,
    description,
    matches: topRadarMatches(matches, 4),
    nextStep,
  }
}

function toSourceTrustView(source: RadarSourceSummary): RadarSourceTrustView {
  if (!source.active) {
    return { ...source, health: 'unverified', freshnessLabel: 'paused' }
  }

  if (source.lastError) {
    return { ...source, health: 'degraded', freshnessLabel: 'source error' }
  }

  if (!source.lastSuccessAt) {
    return { ...source, health: 'unverified', freshnessLabel: 'not refreshed yet' }
  }

  const ageHours = hoursSince(source.lastSuccessAt)
  if (ageHours === null) {
    return { ...source, health: 'unverified', freshnessLabel: 'unknown freshness' }
  }

  if (ageHours > STALE_AFTER_HOURS) {
    return { ...source, health: 'stale', freshnessLabel: `${Math.round(ageHours)}h old` }
  }

  return { ...source, health: 'healthy', freshnessLabel: ageHours < 1 ? 'fresh' : `${Math.round(ageHours)}h old` }
}

function compareRadarMatches(a: RadarMatchView, b: RadarMatchView): number {
  const severityDelta = severityRank(b.severity) - severityRank(a.severity)
  if (severityDelta !== 0) return severityDelta

  const relevanceDelta = b.relevanceScore - a.relevanceScore
  if (relevanceDelta !== 0) return relevanceDelta

  return b.createdAt.localeCompare(a.createdAt)
}

function severityRank(severity: RadarSeverity): number {
  switch (severity) {
    case 'critical':
      return 5
    case 'high':
      return 4
    case 'medium':
      return 3
    case 'low':
      return 2
    case 'info':
      return 1
    default:
      return 0
  }
}

function hoursSince(value: string): number | null {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, (Date.now() - date.getTime()) / 3_600_000)
}
