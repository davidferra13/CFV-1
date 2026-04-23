import {
  createDerivedOutputProvenance,
  type DerivedOutputProvenance,
} from '@/lib/analytics/source-provenance'
import { createServerClient } from '@/lib/db/server'
import type {
  PlanningDataQualitySummary,
  PlanningEvidenceSource,
  PlanningRunSource,
} from '@/lib/planning/contracts'
import {
  createPlanningEvidenceSource,
  summarizePlanningDataQuality,
} from '@/lib/planning/contracts'
import {
  completePlanningRun,
  createPlanningRun,
  failPlanningRun,
  getLatestCompletedPlanningArtifact,
  listCompletedPlanningArtifacts,
  type PlanningArtifactEnvelope,
} from '@/lib/planning/run-store'
import { dateToDateString } from '@/lib/utils/format'
import {
  STAGE_LABELS,
  STAGE_WEIGHTS,
  backtestSeasonalForecast,
  buildForecastConfidence,
  buildForecastExplainability,
  buildMonthlyForecastComposition,
  calculateRevenueVolatility,
  calculateSeasonalIndex,
  calculateTrailingAverage,
  resolveForecastErrorRate,
  type ForecastCalibration,
  type ForecastConfidence,
  type ForecastExplainability,
  type MonthlyDataPoint,
} from './forecast-calculator'

export type MonthlyForecastEntry = {
  month: string
  bookedRevenueCents: number
  pipelineRevenueCents: number
  pipelineOpenRevenueCents: number
  historicalAvgCents: number
  historicalFillCents: number
  expectedRevenueCents: number
  lowRevenueCents: number
  highRevenueCents: number
  visibleRevenueCoveragePercent: number
}

export type QuarterlyForecast = {
  q1: number
  q2: number
  q3: number
  q4: number
}

export type PipelineStageBreakdown = {
  stage: string
  label: string
  count: number
  totalCents: number
  weightedCents: number
  probability: number
}

export type PipelineValue = {
  totalCents: number
  weightedCents: number
  byStage: PipelineStageBreakdown[]
}

export type SeasonalEntry = {
  month: number
  avgRevenueCents: number
}

export type ForecastWindowTotals = {
  bookedCents: number
  weightedPipelineCents: number
  historicalFillCents: number
  expectedCents: number
  lowCents: number
  highCents: number
}

export type RevenueForecastPlanningRun = {
  runId: string
  runSource: PlanningRunSource
  scopeKey: string
  artifactVersion: string
  generatorVersion: string
  generatedAt: string
  asOfDate: string
  servedFromCache: boolean
}

export type RevenueForecastActualsReconciliation = {
  month: string
  forecastRunId: string
  forecastGeneratedAt: string
  forecastAsOfDate: string
  expectedRevenueCents: number
  actualRevenueCents: number
  varianceCents: number
  variancePct: number | null
  withinRange: boolean
  lowRevenueCents: number
  highRevenueCents: number
  bookedRevenueCents: number
  pipelineRevenueCents: number
  historicalFillCents: number
}

export type RevenueForecastActualsCalibration = {
  status: 'unavailable' | 'limited' | 'established'
  sampleSize: number
  meanAbsolutePercentError: number | null
  meanAbsoluteCents: number | null
  withinRangeRatePercent: number | null
  latestClosedMonth: string | null
  note: string
}

export type RevenueForecast = {
  currentMonthActual: number
  currentMonthProjected: number
  currentMonthRange: {
    lowCents: number
    expectedCents: number
    highCents: number
  }
  monthlyForecast: MonthlyForecastEntry[]
  quarterlyForecast: QuarterlyForecast
  pipelineValue: PipelineValue
  seasonalPattern: SeasonalEntry[]
  windowTotals: ForecastWindowTotals
  calibration: ForecastCalibration
  confidence: ForecastConfidence
  explainability: ForecastExplainability
  dataMonthsAvailable: number
  planningRun: RevenueForecastPlanningRun
  evidence: PlanningEvidenceSource[]
  dataQuality: PlanningDataQualitySummary
  actualsReconciliation: RevenueForecastActualsReconciliation[]
  actualsCalibration: RevenueForecastActualsCalibration
  provenance: DerivedOutputProvenance
}

type RevenueForecastCore = Omit<
  RevenueForecast,
  | 'planningRun'
  | 'evidence'
  | 'dataQuality'
  | 'actualsReconciliation'
  | 'actualsCalibration'
  | 'provenance'
>

type StoredRevenueForecastPayload = RevenueForecastCore & {
  evidence: PlanningEvidenceSource[]
  actualsReconciliation: RevenueForecastActualsReconciliation[]
  actualsCalibration: RevenueForecastActualsCalibration
}

type NormalizedForecastEvent = {
  id: string
  status: string
  monthKey: string
  eventDateKey: string
  revenueCents: number
}

type RevenueForecastBuildResult = {
  core: RevenueForecastCore
  evidence: PlanningEvidenceSource[]
  dataQuality: PlanningDataQualitySummary
  actualsReconciliation: RevenueForecastActualsReconciliation[]
  actualsCalibration: RevenueForecastActualsCalibration
  provenance: DerivedOutputProvenance
  summaryPayload: Record<string, unknown>
}

type StoredForecastCandidate = {
  runId: string
  generatedAt: string
  asOfDate: string
  entry: MonthlyForecastEntry
}

const BOOKED_STATUSES = ['paid', 'confirmed', 'in_progress', 'completed']
const PIPELINE_STATUSES = ['draft', 'proposed', 'accepted']
const REVENUE_FORECAST_RUN_TYPE = 'revenue_forecast'
const REVENUE_FORECAST_SCOPE_KEY = 'default'
const REVENUE_FORECAST_ARTIFACT_KEY = 'revenue_forecast'
const REVENUE_FORECAST_ARTIFACT_VERSION = 'revenue-forecast.v1'
const REVENUE_FORECAST_GENERATOR_VERSION = 'finance.revenue-forecast-run.v1'
const INTERACTIVE_CACHE_MINUTES = 60
const RECONCILIATION_ARTIFACT_LIMIT = 120
const RECONCILIATION_RESULT_LIMIT = 6

function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
  return { start, end }
}

function localDateISO(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function isMissingPlanningStoreError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return (
    message.includes('relation "planning_runs" does not exist') ||
    message.includes('relation "planning_run_artifacts" does not exist')
  )
}

function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7)
}

function getQuarterFromMonth(month: number): number {
  return Math.ceil(month / 3)
}

function clampForecastMonths(months: number): number {
  if (!Number.isFinite(months)) return 6
  return Math.max(3, Math.min(12, Math.floor(months)))
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function monthStartIso(monthKey: string): string {
  return `${monthKey}-01`
}

function compareIsoDesc(left: string, right: string): number {
  return right.localeCompare(left)
}

function mapStoredMonthlyForecastEntry(value: unknown): MonthlyForecastEntry[] {
  if (!Array.isArray(value)) return []

  return value
    .map((entry) => {
      const row = entry as Record<string, unknown>
      if (typeof row.month !== 'string') return null

      return {
        month: row.month,
        bookedRevenueCents: Number(row.bookedRevenueCents ?? 0),
        pipelineRevenueCents: Number(row.pipelineRevenueCents ?? 0),
        pipelineOpenRevenueCents: Number(row.pipelineOpenRevenueCents ?? 0),
        historicalAvgCents: Number(row.historicalAvgCents ?? 0),
        historicalFillCents: Number(row.historicalFillCents ?? 0),
        expectedRevenueCents: Number(row.expectedRevenueCents ?? 0),
        lowRevenueCents: Number(row.lowRevenueCents ?? 0),
        highRevenueCents: Number(row.highRevenueCents ?? 0),
        visibleRevenueCoveragePercent: Number(row.visibleRevenueCoveragePercent ?? 0),
      }
    })
    .filter((entry): entry is MonthlyForecastEntry => Boolean(entry))
}

function resolveVariancePercent(
  actualRevenueCents: number,
  expectedRevenueCents: number
): number | null {
  if (expectedRevenueCents <= 0) {
    return actualRevenueCents === 0 ? 0 : null
  }

  return round1(((actualRevenueCents - expectedRevenueCents) / expectedRevenueCents) * 100)
}

function buildRevenueForecastActualsReconciliation(input: {
  currentMonth: string
  previousArtifacts: PlanningArtifactEnvelope[]
  actualByMonth: Record<string, number>
}): RevenueForecastActualsReconciliation[] {
  const candidatesByMonth = new Map<string, StoredForecastCandidate[]>()

  for (const artifactEnvelope of input.previousArtifacts) {
    const payload = artifactEnvelope.artifact.payload as StoredRevenueForecastPayload
    const entries = mapStoredMonthlyForecastEntry(payload.monthlyForecast)

    for (const entry of entries) {
      if (entry.month >= input.currentMonth) continue

      const existing = candidatesByMonth.get(entry.month) ?? []
      existing.push({
        runId: artifactEnvelope.run.id,
        generatedAt: artifactEnvelope.run.completedAt ?? artifactEnvelope.artifact.createdAt,
        asOfDate: artifactEnvelope.run.asOfDate,
        entry,
      })
      candidatesByMonth.set(entry.month, existing)
    }
  }

  const closedMonths = Object.keys(input.actualByMonth)
    .filter((month) => month < input.currentMonth)
    .sort(compareIsoDesc)

  const reconciliations: RevenueForecastActualsReconciliation[] = []

  for (const month of closedMonths) {
    const forecastCandidates = (candidatesByMonth.get(month) ?? [])
      .filter((candidate) => candidate.asOfDate <= monthStartIso(month))
      .sort((left, right) => {
        const asOfCompare = compareIsoDesc(left.asOfDate, right.asOfDate)
        if (asOfCompare !== 0) return asOfCompare
        return compareIsoDesc(left.generatedAt, right.generatedAt)
      })

    const selected = forecastCandidates[0]
    if (!selected) continue

    const actualRevenueCents = input.actualByMonth[month] ?? 0
    const varianceCents = actualRevenueCents - selected.entry.expectedRevenueCents

    reconciliations.push({
      month,
      forecastRunId: selected.runId,
      forecastGeneratedAt: selected.generatedAt,
      forecastAsOfDate: selected.asOfDate,
      expectedRevenueCents: selected.entry.expectedRevenueCents,
      actualRevenueCents,
      varianceCents,
      variancePct: resolveVariancePercent(actualRevenueCents, selected.entry.expectedRevenueCents),
      withinRange:
        actualRevenueCents >= selected.entry.lowRevenueCents &&
        actualRevenueCents <= selected.entry.highRevenueCents,
      lowRevenueCents: selected.entry.lowRevenueCents,
      highRevenueCents: selected.entry.highRevenueCents,
      bookedRevenueCents: selected.entry.bookedRevenueCents,
      pipelineRevenueCents: selected.entry.pipelineRevenueCents,
      historicalFillCents: selected.entry.historicalFillCents,
    })

    if (reconciliations.length >= RECONCILIATION_RESULT_LIMIT) break
  }

  return reconciliations
}

function buildRevenueForecastActualsCalibration(
  reconciliations: RevenueForecastActualsReconciliation[]
): RevenueForecastActualsCalibration {
  if (reconciliations.length === 0) {
    return {
      status: 'unavailable',
      sampleSize: 0,
      meanAbsolutePercentError: null,
      meanAbsoluteCents: null,
      withinRangeRatePercent: null,
      latestClosedMonth: null,
      note: 'No month-open forecast snapshots have closed into actuals yet.',
    }
  }

  const sampleSize = reconciliations.length
  const absCents = reconciliations.map((entry) => Math.abs(entry.varianceCents))
  const absPercent = reconciliations
    .map((entry) => entry.variancePct)
    .filter((value): value is number => value !== null)
    .map((value) => Math.abs(value))
  const withinRangeCount = reconciliations.filter((entry) => entry.withinRange).length

  return {
    status: sampleSize >= 3 ? 'established' : 'limited',
    sampleSize,
    meanAbsolutePercentError:
      absPercent.length > 0
        ? round1(absPercent.reduce((sum, value) => sum + value, 0) / absPercent.length)
        : null,
    meanAbsoluteCents:
      absCents.length > 0
        ? Math.round(absCents.reduce((sum, value) => sum + value, 0) / absCents.length)
        : null,
    withinRangeRatePercent: Math.round((withinRangeCount / sampleSize) * 100),
    latestClosedMonth: reconciliations[0]?.month ?? null,
    note:
      sampleSize >= 3
        ? 'Calibration now includes persisted month-open forecast snapshots.'
        : 'Calibration is bounded to the limited set of persisted forecast snapshots that have closed.',
  }
}

function buildRevenueForecastDataQuality(input: {
  eventCount: number
  dataMonthsAvailable: number
  bookedEventCount: number
  financialCoveragePercent: number | null
  visibleRevenueCoveragePercent: number
  reconciliationSampleSize: number
}): PlanningDataQualitySummary {
  const checks = []

  checks.push({
    key: 'source-data-presence',
    label: 'Source data presence',
    status: input.eventCount > 0 ? 'pass' : 'fail',
    message:
      input.eventCount > 0
        ? `Using ${input.eventCount} events on the canonical finance forecast path.`
        : 'No non-cancelled events were available for this tenant.',
  } as const)

  checks.push({
    key: 'history-depth',
    label: 'Completed-month history',
    status: input.dataMonthsAvailable >= 3 ? 'pass' : 'warn',
    message:
      input.dataMonthsAvailable >= 3
        ? `${input.dataMonthsAvailable} completed months support seasonal shaping.`
        : `Only ${input.dataMonthsAvailable} completed months are available, so seasonality is limited.`,
  } as const)

  checks.push({
    key: 'financial-summary-coverage',
    label: 'Booked financial coverage',
    status:
      input.bookedEventCount === 0 || (input.financialCoveragePercent ?? 100) >= 80
        ? 'pass'
        : 'warn',
    message:
      input.bookedEventCount === 0
        ? 'No booked events needed financial-summary coverage for this window.'
        : `${input.financialCoveragePercent ?? 0}% of booked events have financial summary rows; the remainder fall back to quoted values.`,
  } as const)

  checks.push({
    key: 'visible-revenue-coverage',
    label: 'Visible revenue coverage',
    status: input.visibleRevenueCoveragePercent >= 70 ? 'pass' : 'warn',
    message: `${input.visibleRevenueCoveragePercent}% of the forecast window is already explained by booked or weighted pipeline revenue.`,
  } as const)

  checks.push({
    key: 'snapshot-reconciliation-depth',
    label: 'Persisted actuals reconciliation',
    status: input.reconciliationSampleSize >= 3 ? 'pass' : 'warn',
    message:
      input.reconciliationSampleSize >= 3
        ? `${input.reconciliationSampleSize} closed months can be reconciled against stored forecast snapshots.`
        : 'Stored forecast snapshots have not yet accumulated enough closed months for deep calibration.',
  } as const)

  return summarizePlanningDataQuality(checks)
}

function buildStoredRevenueForecastPayload(
  input: RevenueForecastBuildResult
): StoredRevenueForecastPayload {
  return {
    ...input.core,
    evidence: input.evidence,
    actualsReconciliation: input.actualsReconciliation,
    actualsCalibration: input.actualsCalibration,
  }
}

function buildRevenueForecastSummaryPayload(
  input: RevenueForecastBuildResult
): Record<string, unknown> {
  return {
    currentMonthProjectedCents: input.core.currentMonthProjected,
    expectedWindowCents: input.core.windowTotals.expectedCents,
    confidenceLevel: input.core.confidence.level,
    confidenceScorePercent: input.core.confidence.scorePercent,
    dataMonthsAvailable: input.core.dataMonthsAvailable,
    qualityStatus: input.dataQuality.overallStatus,
    reconciledClosedMonths: input.actualsCalibration.sampleSize,
  }
}

function materializeRevenueForecastResponse(
  artifactEnvelope: PlanningArtifactEnvelope,
  payload: StoredRevenueForecastPayload
): RevenueForecast {
  return {
    ...payload,
    planningRun: {
      runId: artifactEnvelope.run.id,
      runSource: artifactEnvelope.run.runSource,
      scopeKey: artifactEnvelope.run.scopeKey,
      artifactVersion: artifactEnvelope.artifact.artifactVersion,
      generatorVersion: artifactEnvelope.run.generatorVersion,
      generatedAt: artifactEnvelope.run.completedAt ?? artifactEnvelope.artifact.createdAt,
      asOfDate: artifactEnvelope.run.asOfDate,
      servedFromCache: true,
    },
    dataQuality: artifactEnvelope.artifact.dataQuality,
    provenance: artifactEnvelope.artifact.provenance,
  }
}

function materializeEphemeralRevenueForecastResponse(
  buildResult: RevenueForecastBuildResult,
  runSource: PlanningRunSource
): RevenueForecast {
  const payload = buildStoredRevenueForecastPayload(buildResult)
  const generatedAt = buildResult.provenance.generatedAt

  return {
    ...payload,
    planningRun: {
      runId: `ephemeral:${generatedAt}`,
      runSource,
      scopeKey: REVENUE_FORECAST_SCOPE_KEY,
      artifactVersion: REVENUE_FORECAST_ARTIFACT_VERSION,
      generatorVersion: REVENUE_FORECAST_GENERATOR_VERSION,
      generatedAt,
      asOfDate: localDateISO(new Date(generatedAt)),
      servedFromCache: false,
    },
    dataQuality: buildResult.dataQuality,
    provenance: buildResult.provenance,
  }
}

async function buildRevenueForecastForTenant(
  tenantId: string,
  months: number
): Promise<RevenueForecastBuildResult> {
  const db: any = createServerClient()
  const now = new Date()
  const generatedAt = now.toISOString()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { start: monthStart, end: monthEnd } = getCurrentMonthRange()

  const [{ data: events }, { data: financials }, previousArtifacts] = await Promise.all([
    db
      .from('events')
      .select('id, event_date, status, quoted_price_cents')
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .not('event_date', 'is', null),
    db
      .from('event_financial_summary')
      .select('event_id, net_revenue_cents, quoted_price_cents, total_paid_cents')
      .eq('tenant_id', tenantId),
    listCompletedPlanningArtifacts({
      tenantId,
      runType: REVENUE_FORECAST_RUN_TYPE,
      artifactKey: REVENUE_FORECAST_ARTIFACT_KEY,
      scopeKey: REVENUE_FORECAST_SCOPE_KEY,
      limit: RECONCILIATION_ARTIFACT_LIMIT,
    }).catch((error) => {
      if (isMissingPlanningStoreError(error)) return []
      throw error
    }),
  ])

  const finMap = new Map<string, any>()
  for (const financial of financials ?? []) {
    if (financial.event_id) finMap.set(financial.event_id, financial)
  }

  function getEventRevenue(event: any): number {
    const financial = finMap.get(event.id)
    if (financial?.net_revenue_cents != null && financial.net_revenue_cents > 0) {
      return financial.net_revenue_cents
    }
    if (financial?.total_paid_cents != null && financial.total_paid_cents > 0) {
      return financial.total_paid_cents
    }
    return event.quoted_price_cents || 0
  }

  const normalizedEvents: NormalizedForecastEvent[] = (events ?? []).map((event: any) => ({
    id: event.id,
    status: event.status,
    monthKey: getMonthKey(dateToDateString(event.event_date as Date | string)),
    eventDateKey: dateToDateString(event.event_date as Date | string),
    revenueCents: getEventRevenue(event),
  }))

  const currentMonthActual = normalizedEvents
    .filter(
      (event) =>
        event.status === 'completed' &&
        event.eventDateKey >= monthStart &&
        event.eventDateKey <= monthEnd
    )
    .reduce((sum, event) => sum + event.revenueCents, 0)

  const historicalByMonth: Record<string, number> = {}
  for (const event of normalizedEvents) {
    if (event.status === 'completed') {
      historicalByMonth[event.monthKey] =
        (historicalByMonth[event.monthKey] || 0) + event.revenueCents
    }
  }

  const historicalData: MonthlyDataPoint[] = Object.entries(historicalByMonth)
    .map(([month, revenueCents]) => ({ month, revenueCents }))
    .sort((left, right) => left.month.localeCompare(right.month))

  const seasonalIndex = calculateSeasonalIndex(historicalData)
  const trailingAvg = calculateTrailingAverage(historicalData)
  const recentVolatilityPercent = calculateRevenueVolatility(historicalData)
  const calibration = backtestSeasonalForecast(historicalData)
  const errorRate = resolveForecastErrorRate(calibration, historicalData.length)

  const monthlyForecast: MonthlyForecastEntry[] = []
  let forecastYear = now.getFullYear()
  let forecastMonth = now.getMonth() + 1

  for (let index = 0; index < months; index++) {
    const monthKey = `${forecastYear}-${String(forecastMonth).padStart(2, '0')}`

    const bookedEvents = normalizedEvents.filter(
      (event) => BOOKED_STATUSES.includes(event.status) && event.monthKey === monthKey
    )
    const bookedRevenueCents = bookedEvents.reduce((sum, event) => sum + event.revenueCents, 0)

    const pipelineEvents = normalizedEvents.filter(
      (event) => PIPELINE_STATUSES.includes(event.status) && event.monthKey === monthKey
    )
    const pipelineOpenRevenueCents = pipelineEvents.reduce(
      (sum, event) => sum + event.revenueCents,
      0
    )
    const pipelineRevenueCents = pipelineEvents.reduce(
      (sum, event) => sum + Math.round(event.revenueCents * (STAGE_WEIGHTS[event.status] ?? 0)),
      0
    )

    const monthIndex = forecastMonth - 1
    const historicalAvgCents =
      trailingAvg > 0 ? Math.round(trailingAvg * seasonalIndex[monthIndex]) : 0

    const composition = buildMonthlyForecastComposition({
      bookedRevenueCents,
      pipelineRevenueCents,
      pipelineOpenRevenueCents,
      historicalBaselineCents: monthKey === currentMonth ? 0 : historicalAvgCents,
      errorRate,
    })

    monthlyForecast.push({
      month: monthKey,
      bookedRevenueCents,
      pipelineRevenueCents,
      pipelineOpenRevenueCents,
      historicalAvgCents,
      historicalFillCents: composition.historicalFillCents,
      expectedRevenueCents: composition.expectedRevenueCents,
      lowRevenueCents: composition.lowRevenueCents,
      highRevenueCents: composition.highRevenueCents,
      visibleRevenueCoveragePercent: composition.visibleRevenueCoveragePercent,
    })

    forecastMonth += 1
    if (forecastMonth > 12) {
      forecastMonth = 1
      forecastYear += 1
    }
  }

  const currentMonthEntry = monthlyForecast[0] ?? {
    lowRevenueCents: currentMonthActual,
    expectedRevenueCents: currentMonthActual,
    highRevenueCents: currentMonthActual,
  }

  const quarterlyTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const entry of monthlyForecast) {
    const quarter = getQuarterFromMonth(parseInt(entry.month.split('-')[1] ?? '1', 10))
    quarterlyTotals[quarter] += entry.expectedRevenueCents
  }

  const allFutureNonCompleted = normalizedEvents.filter(
    (event) =>
      event.eventDateKey >= monthStart &&
      event.status !== 'completed' &&
      event.status !== 'cancelled'
  )
  const stageMap: Record<string, { count: number; totalCents: number }> = {}
  for (const status of [
    ...PIPELINE_STATUSES,
    ...BOOKED_STATUSES.filter((entry) => entry !== 'completed'),
  ]) {
    stageMap[status] = { count: 0, totalCents: 0 }
  }
  for (const event of allFutureNonCompleted) {
    if (!stageMap[event.status]) {
      stageMap[event.status] = { count: 0, totalCents: 0 }
    }
    stageMap[event.status].count += 1
    stageMap[event.status].totalCents += event.revenueCents
  }

  const byStage: PipelineStageBreakdown[] = Object.entries(stageMap)
    .filter(([_, value]) => value.count > 0)
    .map(([stage, value]) => ({
      stage,
      label: STAGE_LABELS[stage] || stage,
      count: value.count,
      totalCents: value.totalCents,
      weightedCents: Math.round(value.totalCents * (STAGE_WEIGHTS[stage] ?? 0)),
      probability: STAGE_WEIGHTS[stage] ?? 0,
    }))
    .sort((left, right) => right.probability - left.probability)

  const windowTotals = monthlyForecast.reduce(
    (totals, month) => ({
      bookedCents: totals.bookedCents + month.bookedRevenueCents,
      weightedPipelineCents: totals.weightedPipelineCents + month.pipelineRevenueCents,
      historicalFillCents: totals.historicalFillCents + month.historicalFillCents,
      expectedCents: totals.expectedCents + month.expectedRevenueCents,
      lowCents: totals.lowCents + month.lowRevenueCents,
      highCents: totals.highCents + month.highRevenueCents,
    }),
    {
      bookedCents: 0,
      weightedPipelineCents: 0,
      historicalFillCents: 0,
      expectedCents: 0,
      lowCents: 0,
      highCents: 0,
    }
  )

  const visibleRevenueCoveragePercent =
    windowTotals.expectedCents > 0
      ? Math.round(
          ((windowTotals.bookedCents + windowTotals.weightedPipelineCents) /
            windowTotals.expectedCents) *
            100
        )
      : 0

  const confidence = buildForecastConfidence({
    dataMonthsAvailable: historicalData.length,
    calibration,
    recentVolatilityPercent,
    visibleRevenueCoveragePercent,
  })
  const historicalFillSharePercent =
    windowTotals.expectedCents > 0
      ? Math.round((windowTotals.historicalFillCents / windowTotals.expectedCents) * 100)
      : 0
  const explainability = buildForecastExplainability({
    confidence,
    historicalFillSharePercent,
  })

  const bookedEventCount = normalizedEvents.filter((event) =>
    BOOKED_STATUSES.includes(event.status)
  ).length
  const bookedEventsWithFinancialSummary = normalizedEvents.filter(
    (event) => BOOKED_STATUSES.includes(event.status) && finMap.has(event.id)
  ).length
  const financialCoveragePercent =
    bookedEventCount > 0
      ? Math.round((bookedEventsWithFinancialSummary / bookedEventCount) * 100)
      : null

  const actualsReconciliation = buildRevenueForecastActualsReconciliation({
    currentMonth,
    previousArtifacts,
    actualByMonth: historicalByMonth,
  })
  const actualsCalibration = buildRevenueForecastActualsCalibration(actualsReconciliation)

  const evidence = [
    createPlanningEvidenceSource({
      key: 'events',
      label: 'Events',
      asOf: generatedAt,
      recordCount: normalizedEvents.length,
      note: 'Non-cancelled events with an event date.',
    }),
    createPlanningEvidenceSource({
      key: 'event_financial_summary',
      label: 'Financial summaries',
      asOf: generatedAt,
      recordCount: (financials ?? []).length,
      coveragePercent: financialCoveragePercent,
      note:
        bookedEventCount > 0
          ? 'Booked-event revenue prefers actual summary rows and falls back to quoted values when missing.'
          : 'No booked events required financial-summary coverage.',
    }),
    createPlanningEvidenceSource({
      key: 'planning_run_artifacts',
      label: 'Persisted forecast snapshots',
      asOf: generatedAt,
      recordCount: previousArtifacts.length,
      coveragePercent:
        previousArtifacts.length === 0 ? 0 : actualsCalibration.sampleSize > 0 ? 100 : 50,
      note: 'Stored month-open forecast snapshots used for actuals reconciliation when available.',
    }),
  ]

  const dataQuality = buildRevenueForecastDataQuality({
    eventCount: normalizedEvents.length,
    dataMonthsAvailable: historicalData.length,
    bookedEventCount,
    financialCoveragePercent,
    visibleRevenueCoveragePercent,
    reconciliationSampleSize: actualsCalibration.sampleSize,
  })

  const core: RevenueForecastCore = {
    currentMonthActual,
    currentMonthProjected: currentMonthEntry.expectedRevenueCents,
    currentMonthRange: {
      lowCents: currentMonthEntry.lowRevenueCents,
      expectedCents: currentMonthEntry.expectedRevenueCents,
      highCents: currentMonthEntry.highRevenueCents,
    },
    monthlyForecast,
    quarterlyForecast: {
      q1: quarterlyTotals[1],
      q2: quarterlyTotals[2],
      q3: quarterlyTotals[3],
      q4: quarterlyTotals[4],
    },
    pipelineValue: {
      totalCents: byStage.reduce((sum, entry) => sum + entry.totalCents, 0),
      weightedCents: byStage.reduce((sum, entry) => sum + entry.weightedCents, 0),
      byStage,
    },
    seasonalPattern: seasonalIndex.map((indexValue, monthIndex) => ({
      month: monthIndex + 1,
      avgRevenueCents: Math.round(trailingAvg * indexValue),
    })),
    windowTotals,
    calibration,
    confidence,
    explainability,
    dataMonthsAvailable: historicalData.length,
  }

  const provenance = createDerivedOutputProvenance({
    asOf: generatedAt,
    derivationMethod: 'deterministic',
    derivationSource: 'lib/finance/revenue-forecast-run.ts',
    generatedAt,
    inputs: [
      { kind: 'event', label: 'events', asOf: generatedAt },
      { kind: 'report', label: 'event_financial_summary', asOf: generatedAt },
      { kind: 'report', label: 'planning_run_artifacts', asOf: generatedAt },
    ],
    moduleId: 'finance.revenue-forecast',
  })

  const buildResult: RevenueForecastBuildResult = {
    core,
    evidence,
    dataQuality,
    actualsReconciliation,
    actualsCalibration,
    provenance,
    summaryPayload: {},
  }

  buildResult.summaryPayload = buildRevenueForecastSummaryPayload(buildResult)
  return buildResult
}

export async function getRevenueForecastForTenant(
  tenantId: string,
  months = 6,
  options?: {
    runSource?: PlanningRunSource
    forceFresh?: boolean
    maxAgeMinutes?: number
  }
): Promise<RevenueForecast> {
  const safeMonths = clampForecastMonths(months)
  const runSource = options?.runSource ?? 'interactive'
  const maxAgeMinutes =
    typeof options?.maxAgeMinutes === 'number' ? options.maxAgeMinutes : INTERACTIVE_CACHE_MINUTES

  if (!options?.forceFresh) {
    const cached = await getLatestCompletedPlanningArtifact({
      tenantId,
      runType: REVENUE_FORECAST_RUN_TYPE,
      scopeKey: REVENUE_FORECAST_SCOPE_KEY,
      artifactKey: REVENUE_FORECAST_ARTIFACT_KEY,
      horizonMonths: safeMonths,
      maxAgeMinutes,
    }).catch((error) => {
      if (isMissingPlanningStoreError(error)) return null
      throw error
    })

    if (cached) {
      return materializeRevenueForecastResponse(
        cached,
        cached.artifact.payload as StoredRevenueForecastPayload
      )
    }
  }

  const run = await createPlanningRun({
    tenantId,
    runType: REVENUE_FORECAST_RUN_TYPE,
    runSource,
    scopeKey: REVENUE_FORECAST_SCOPE_KEY,
    asOfDate: localDateISO(new Date()),
    horizonMonths: safeMonths,
    generatorVersion: REVENUE_FORECAST_GENERATOR_VERSION,
    requestPayload: {
      months: safeMonths,
      cacheBypass: Boolean(options?.forceFresh),
    },
  }).catch(async (error) => {
    if (!isMissingPlanningStoreError(error)) throw error
    const buildResult = await buildRevenueForecastForTenant(tenantId, safeMonths)
    return materializeEphemeralRevenueForecastResponse(buildResult, runSource)
  })

  if ('currentMonthActual' in run) return run

  try {
    const buildResult = await buildRevenueForecastForTenant(tenantId, safeMonths)
    const payload = buildStoredRevenueForecastPayload(buildResult)
    const completed = await completePlanningRun({
      runId: run.id,
      summaryPayload: buildResult.summaryPayload,
      artifact: {
        tenantId,
        artifactKey: REVENUE_FORECAST_ARTIFACT_KEY,
        artifactVersion: REVENUE_FORECAST_ARTIFACT_VERSION,
        payload,
        provenance: buildResult.provenance,
        dataQuality: buildResult.dataQuality,
      },
    })

    return {
      ...payload,
      planningRun: {
        runId: completed.run.id,
        runSource: completed.run.runSource,
        scopeKey: completed.run.scopeKey,
        artifactVersion: completed.artifact.artifactVersion,
        generatorVersion: completed.run.generatorVersion,
        generatedAt: completed.run.completedAt ?? completed.artifact.createdAt,
        asOfDate: completed.run.asOfDate,
        servedFromCache: false,
      },
      dataQuality: completed.artifact.dataQuality,
      provenance: completed.artifact.provenance,
    }
  } catch (error) {
    await failPlanningRun({
      runId: run.id,
      errorPayload: {
        message: error instanceof Error ? error.message : String(error),
      },
    }).catch((failureError) => {
      if (!isMissingPlanningStoreError(failureError)) throw failureError
    })
    throw error
  }
}

export const __testOnly = {
  buildRevenueForecastActualsCalibration,
  buildRevenueForecastActualsReconciliation,
}
