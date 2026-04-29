import { getBetaSurveyResponseMeta } from './survey-utils'

export type Wave1SurveyAnalysisRecord = {
  id?: string | null
  submittedAt?: string | null
  submitted_at?: string | null
  respondentRole?: string | null
  respondent_role?: string | null
  source?: string | null
  channel?: string | null
  campaign?: string | null
  npsScore?: number | null
  nps_score?: number | null
  overallSatisfaction?: number | null
  overall_satisfaction?: number | null
  wouldPay?: boolean | string | null
  would_pay?: boolean | string | null
  techComfort?: number | null
  tech_comfort?: number | null
  qualified?: boolean | string | null
  isQualified?: boolean | string | null
  is_qualified?: boolean | string | null
  answers?: Record<string, unknown> | null
}

export type Wave1SurveyReadinessThresholds = {
  minSubmitted: number
  minQualified: number
  minQualificationRate: number
  minWouldPayYes: number
  minAverageSatisfaction: number
  minNpsScore: number
  maxTopObjectionShare: number
}

export type Wave1SurveyAnalysisOptions = {
  thresholds?: Partial<Wave1SurveyReadinessThresholds>
}

export type Wave1SurveyCountSummary = {
  total: number
  submitted: number
  qualified: number
  unqualified: number
  qualificationRate: number
  wouldPayYes: number
  wouldPayNo: number
  wouldPayUnknown: number
  averageNps: number | null
  npsScore: number | null
  averageSatisfaction: number | null
}

export type Wave1SurveyPerformanceSegment = {
  key: string
  total: number
  submitted: number
  qualified: number
  qualificationRate: number
  wouldPayYes: number
  averageNps: number | null
  averageSatisfaction: number | null
}

export type Wave1SurveyThemeHit = {
  key: string
  label: string
  count: number
  responseIds: string[]
  shareOfSubmitted: number
}

export type Wave1SurveyReadinessCheck = {
  key: keyof Wave1SurveyReadinessThresholds
  label: string
  value: number
  target: number
  passed: boolean
}

export type Wave1SurveyReadiness = {
  status: 'ready' | 'needs_more_signal' | 'not_ready'
  score: number
  checks: Wave1SurveyReadinessCheck[]
  passed: string[]
  failed: string[]
}

export type Wave1SurveyNextAction = {
  id: string
  priority: 'high' | 'medium' | 'low'
  label: string
  reason: string
}

export type Wave1SurveyAnalysis = {
  counts: Wave1SurveyCountSummary
  sourcePerformance: Wave1SurveyPerformanceSegment[]
  channelPerformance: Wave1SurveyPerformanceSegment[]
  objections: Wave1SurveyThemeHit[]
  themes: Wave1SurveyThemeHit[]
  readiness: Wave1SurveyReadiness
  nextActions: Wave1SurveyNextAction[]
}

type NormalizedResponse = {
  id: string
  submitted: boolean
  source: string
  channel: string
  nps: number | null
  satisfaction: number | null
  wouldPay: boolean | null
  qualified: boolean
  text: string
}

const DEFAULT_THRESHOLDS: Wave1SurveyReadinessThresholds = {
  minSubmitted: 20,
  minQualified: 8,
  minQualificationRate: 40,
  minWouldPayYes: 5,
  minAverageSatisfaction: 7,
  minNpsScore: 0,
  maxTopObjectionShare: 45,
}

const OBJECTION_KEYWORDS: Array<{ key: string; label: string; terms: string[] }> = [
  {
    key: 'price',
    label: 'Pricing concern',
    terms: ['price', 'pricing', 'cost', 'expensive', 'afford', 'budget', 'fee', 'subscription'],
  },
  {
    key: 'time',
    label: 'Time or setup burden',
    terms: ['setup', 'onboard', 'learning curve', 'too busy', 'time burden', 'maintain'],
  },
  {
    key: 'trust',
    label: 'Trust, accuracy, or privacy concern',
    terms: ['trust', 'accurate', 'accuracy', 'privacy', 'security', 'reliable', 'wrong', 'mistake'],
  },
  {
    key: 'workflow',
    label: 'Workflow fit concern',
    terms: ['integrate', 'integration', 'duplicate', 'spreadsheet', 'current process'],
  },
  {
    key: 'feature_gap',
    label: 'Missing feature concern',
    terms: ['missing', 'wish', 'lack', 'lacks', 'does not have', "doesn't have"],
  },
  {
    key: 'complexity',
    label: 'Complexity concern',
    terms: ['confusing', 'complicated', 'hard to use', 'difficult', 'overwhelming'],
  },
  {
    key: 'adoption',
    label: 'Team or client adoption concern',
    terms: ['staff training', 'team training', 'adoption', 'change management'],
  },
]

const THEME_KEYWORDS: Array<{ key: string; label: string; terms: string[] }> = [
  {
    key: 'automation',
    label: 'Automation value',
    terms: ['automate', 'automation', 'auto', 'reminder', 'follow up', 'follow-up'],
  },
  {
    key: 'time_savings',
    label: 'Time savings',
    terms: ['save time', 'time saver', 'faster', 'speed', 'less admin', 'hours'],
  },
  {
    key: 'client_experience',
    label: 'Client experience',
    terms: ['client experience', 'client portal', 'professional', 'communication', 'guest'],
  },
  {
    key: 'ops_control',
    label: 'Operations control',
    terms: ['organized', 'operations', 'ops', 'checklist', 'timeline', 'schedule', 'control'],
  },
  {
    key: 'payments',
    label: 'Payment workflow',
    terms: ['payment', 'invoice', 'deposit', 'stripe', 'paid', 'checkout'],
  },
]

export function analyzeWave1SurveyResponses(
  records: Wave1SurveyAnalysisRecord[],
  options: Wave1SurveyAnalysisOptions = {}
): Wave1SurveyAnalysis {
  const thresholds = { ...DEFAULT_THRESHOLDS, ...options.thresholds }
  const normalized = records.map(normalizeResponse)
  const submitted = normalized.filter((record) => record.submitted)
  const counts = buildCounts(records.length, submitted)
  const objections = extractThemeHits(submitted, OBJECTION_KEYWORDS)
  const themes = extractThemeHits(submitted, THEME_KEYWORDS)
  const readiness = evaluateReadiness(counts, objections, thresholds)

  return {
    counts,
    sourcePerformance: buildPerformanceSegments(submitted, (record) => record.source),
    channelPerformance: buildPerformanceSegments(submitted, (record) => record.channel),
    objections,
    themes,
    readiness,
    nextActions: buildNextActions(counts, objections, themes, readiness, thresholds, submitted),
  }
}

function normalizeResponse(record: Wave1SurveyAnalysisRecord, index: number): NormalizedResponse {
  const answers = record.answers || {}
  const meta = getBetaSurveyResponseMeta(answers)
  const nps = normalizeNumber(record.npsScore ?? record.nps_score ?? answers.nps_score)
  const satisfaction = normalizeNumber(
    record.overallSatisfaction ?? record.overall_satisfaction ?? answers.overall_satisfaction
  )
  const wouldPay = normalizeBoolean(record.wouldPay ?? record.would_pay ?? answers.would_pay)

  return {
    id: normalizeString(record.id) ?? `response-${index + 1}`,
    submitted: isSubmitted(record),
    source: normalizeSegment(record.source ?? meta.source ?? answers.source),
    channel: normalizeSegment(record.channel ?? meta.channel ?? answers.channel),
    nps,
    satisfaction,
    wouldPay,
    qualified: isQualified(record, answers, nps, satisfaction, wouldPay),
    text: collectText(answers),
  }
}

function isSubmitted(record: Wave1SurveyAnalysisRecord): boolean {
  const hasSubmittedKey = 'submittedAt' in record || 'submitted_at' in record
  if (!hasSubmittedKey) return true

  return Boolean(record.submittedAt ?? record.submitted_at)
}

function isQualified(
  record: Wave1SurveyAnalysisRecord,
  answers: Record<string, unknown>,
  nps: number | null,
  satisfaction: number | null,
  wouldPay: boolean | null
): boolean {
  const explicit = normalizeBoolean(
    record.qualified ?? record.isQualified ?? record.is_qualified ?? answers.qualified
  )
  if (explicit !== null) return explicit

  const fitText = collectTextFromKeys(answers, [
    'fit',
    'qualification',
    'qualified',
    'interest',
    'intent',
    'would_use',
  ])
  if (
    /\b(disqualified|not qualified|poor fit|bad fit|not interested|no interest)\b/i.test(fitText)
  ) {
    return false
  }
  if (
    /\b(qualified|good fit|great fit|interested|very interested|definitely|yes)\b/i.test(fitText)
  ) {
    return true
  }

  return (
    wouldPay === true || (nps !== null && nps >= 8) || (satisfaction !== null && satisfaction >= 8)
  )
}

function buildCounts(total: number, submitted: NormalizedResponse[]): Wave1SurveyCountSummary {
  const qualified = submitted.filter((record) => record.qualified).length
  const wouldPayYes = submitted.filter((record) => record.wouldPay === true).length
  const wouldPayNo = submitted.filter((record) => record.wouldPay === false).length
  const npsScores = submitted.map((record) => record.nps).filter(isNumber)

  return {
    total,
    submitted: submitted.length,
    qualified,
    unqualified: submitted.length - qualified,
    qualificationRate: percentage(qualified, submitted.length),
    wouldPayYes,
    wouldPayNo,
    wouldPayUnknown: submitted.length - wouldPayYes - wouldPayNo,
    averageNps: average(npsScores),
    npsScore: npsScores.length > 0 ? calculateNps(npsScores) : null,
    averageSatisfaction: average(submitted.map((record) => record.satisfaction).filter(isNumber)),
  }
}

function buildPerformanceSegments(
  records: NormalizedResponse[],
  getKey: (record: NormalizedResponse) => string
): Wave1SurveyPerformanceSegment[] {
  const grouped = new Map<string, NormalizedResponse[]>()

  for (const record of records) {
    const key = getKey(record)
    grouped.set(key, [...(grouped.get(key) || []), record])
  }

  return Array.from(grouped.entries())
    .map(([key, group]) => {
      const qualified = group.filter((record) => record.qualified).length
      return {
        key,
        total: group.length,
        submitted: group.length,
        qualified,
        qualificationRate: percentage(qualified, group.length),
        wouldPayYes: group.filter((record) => record.wouldPay === true).length,
        averageNps: average(group.map((record) => record.nps).filter(isNumber)),
        averageSatisfaction: average(group.map((record) => record.satisfaction).filter(isNumber)),
      }
    })
    .sort(comparePerformanceSegments)
}

function extractThemeHits(
  records: NormalizedResponse[],
  dictionary: Array<{ key: string; label: string; terms: string[] }>
): Wave1SurveyThemeHit[] {
  return dictionary
    .map((entry) => {
      const responseIds = records
        .filter((record) => includesAnyTerm(record.text, entry.terms))
        .map((record) => record.id)
        .sort()

      return {
        key: entry.key,
        label: entry.label,
        count: responseIds.length,
        responseIds,
        shareOfSubmitted: percentage(responseIds.length, records.length),
      }
    })
    .filter((hit) => hit.count > 0)
    .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key))
}

function evaluateReadiness(
  counts: Wave1SurveyCountSummary,
  objections: Wave1SurveyThemeHit[],
  thresholds: Wave1SurveyReadinessThresholds
): Wave1SurveyReadiness {
  const topObjectionShare = objections[0]?.shareOfSubmitted ?? 0
  const checks: Wave1SurveyReadinessCheck[] = [
    {
      key: 'minSubmitted',
      label: 'Submitted responses',
      value: counts.submitted,
      target: thresholds.minSubmitted,
      passed: counts.submitted >= thresholds.minSubmitted,
    },
    {
      key: 'minQualified',
      label: 'Qualified responses',
      value: counts.qualified,
      target: thresholds.minQualified,
      passed: counts.qualified >= thresholds.minQualified,
    },
    {
      key: 'minQualificationRate',
      label: 'Qualification rate',
      value: counts.qualificationRate,
      target: thresholds.minQualificationRate,
      passed: counts.qualificationRate >= thresholds.minQualificationRate,
    },
    {
      key: 'minWouldPayYes',
      label: 'Would-pay yes responses',
      value: counts.wouldPayYes,
      target: thresholds.minWouldPayYes,
      passed: counts.wouldPayYes >= thresholds.minWouldPayYes,
    },
    {
      key: 'minAverageSatisfaction',
      label: 'Average satisfaction',
      value: counts.averageSatisfaction ?? 0,
      target: thresholds.minAverageSatisfaction,
      passed: (counts.averageSatisfaction ?? 0) >= thresholds.minAverageSatisfaction,
    },
    {
      key: 'minNpsScore',
      label: 'NPS score',
      value: counts.npsScore ?? -100,
      target: thresholds.minNpsScore,
      passed: (counts.npsScore ?? -100) >= thresholds.minNpsScore,
    },
    {
      key: 'maxTopObjectionShare',
      label: 'Top objection concentration',
      value: topObjectionShare,
      target: thresholds.maxTopObjectionShare,
      passed: topObjectionShare <= thresholds.maxTopObjectionShare,
    },
  ]
  const passed = checks.filter((check) => check.passed).map((check) => check.key)
  const failed = checks.filter((check) => !check.passed).map((check) => check.key)
  const score = percentage(passed.length, checks.length)

  return {
    status: failed.length === 0 ? 'ready' : score >= 60 ? 'needs_more_signal' : 'not_ready',
    score,
    checks,
    passed,
    failed,
  }
}

function buildNextActions(
  counts: Wave1SurveyCountSummary,
  objections: Wave1SurveyThemeHit[],
  themes: Wave1SurveyThemeHit[],
  readiness: Wave1SurveyReadiness,
  thresholds: Wave1SurveyReadinessThresholds,
  submitted: NormalizedResponse[]
): Wave1SurveyNextAction[] {
  const actions: Wave1SurveyNextAction[] = []

  if (counts.submitted < thresholds.minSubmitted) {
    actions.push({
      id: 'collect-more-responses',
      priority: 'high',
      label: 'Collect more Wave-1 responses',
      reason: `${counts.submitted} submitted responses is below the ${thresholds.minSubmitted} response threshold.`,
    })
  }

  if (
    counts.qualified < thresholds.minQualified ||
    counts.qualificationRate < thresholds.minQualificationRate
  ) {
    actions.push({
      id: 'tighten-qualified-outreach',
      priority: 'high',
      label: 'Tighten outreach toward qualified operators',
      reason: `${counts.qualified} qualified responses at ${counts.qualificationRate}% is not enough signal for launch decisions.`,
    })
  }

  if (counts.wouldPayYes < thresholds.minWouldPayYes) {
    actions.push({
      id: 'run-pricing-followups',
      priority: 'medium',
      label: 'Run pricing follow-up calls',
      reason: `${counts.wouldPayYes} would-pay yes responses is below the ${thresholds.minWouldPayYes} response threshold.`,
    })
  }

  const topObjection = objections[0]
  if (topObjection && topObjection.shareOfSubmitted > thresholds.maxTopObjectionShare) {
    actions.push({
      id: `address-${topObjection.key}`,
      priority: 'high',
      label: `Address ${topObjection.label.toLowerCase()}`,
      reason: `${topObjection.label} appears in ${topObjection.shareOfSubmitted}% of submitted responses.`,
    })
  }

  const bestSource = buildPerformanceSegments(submitted, (record) => record.source)[0]
  if (bestSource && bestSource.qualified > 0) {
    actions.push({
      id: 'double-down-best-source',
      priority: readiness.status === 'ready' ? 'medium' : 'low',
      label: `Double down on ${bestSource.key}`,
      reason: `${bestSource.key} has ${bestSource.qualified} qualified responses at ${bestSource.qualificationRate}%.`,
    })
  }

  if (readiness.status === 'ready') {
    actions.unshift({
      id: 'schedule-wave-1-pilot',
      priority: 'high',
      label: 'Schedule Wave-1 pilot conversations',
      reason: 'All readiness thresholds passed.',
    })
  } else if (themes[0]) {
    actions.push({
      id: `use-theme-${themes[0].key}`,
      priority: 'low',
      label: `Use ${themes[0].label.toLowerCase()} in follow-up copy`,
      reason: `${themes[0].label} is the strongest positive theme in submitted responses.`,
    })
  }

  return actions
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const parsed = Number(value.trim())
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return null

  const normalized = value.trim().toLowerCase()
  if (!normalized) return null
  if (
    ['yes', 'y', 'true', 'definitely', 'qualified', 'good fit', 'great fit'].includes(normalized)
  ) {
    return true
  }
  if (
    ['no', 'n', 'false', 'not qualified', 'disqualified', 'poor fit', 'bad fit'].includes(
      normalized
    )
  ) {
    return false
  }
  if (normalized.includes('probably not')) return false
  if (normalized.includes('definitely') || normalized.includes('yes')) return true

  return null
}

function normalizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeSegment(value: unknown): string {
  return normalizeString(value)?.toLowerCase().replace(/\s+/g, '_') || 'unknown'
}

function collectText(answers: Record<string, unknown>): string {
  return Object.entries(answers)
    .filter(([key]) => !key.startsWith('__'))
    .flatMap(([, value]) => valueToText(value))
    .join(' ')
    .toLowerCase()
}

function collectTextFromKeys(answers: Record<string, unknown>, keys: string[]): string {
  return keys
    .flatMap((key) => valueToText(answers[key]))
    .join(' ')
    .toLowerCase()
}

function valueToText(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.flatMap(valueToText)
  if (value && typeof value === 'object') return Object.values(value).flatMap(valueToText)
  return []
}

function includesAnyTerm(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term))
}

function average(values: number[]): number | null {
  if (values.length === 0) return null
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 1)
}

function calculateNps(values: number[]): number {
  const promoters = values.filter((value) => value >= 9).length
  const detractors = values.filter((value) => value <= 6).length

  return Math.round(((promoters - detractors) / values.length) * 100)
}

function percentage(value: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
}

function round(value: number, digits: number): number {
  const multiplier = 10 ** digits
  return Math.round(value * multiplier) / multiplier
}

function isNumber(value: number | null): value is number {
  return typeof value === 'number'
}

function comparePerformanceSegments(
  left: Wave1SurveyPerformanceSegment,
  right: Wave1SurveyPerformanceSegment
): number {
  return (
    right.qualified - left.qualified ||
    right.qualificationRate - left.qualificationRate ||
    right.submitted - left.submitted ||
    left.key.localeCompare(right.key)
  )
}
