/**
 * PIE Compliance Dashboard
 *
 * One function to check all 10 PIE Laws. Returns a structured report
 * showing compliance status, violations, and metrics for each law.
 *
 * NOT a 'use server' file. Called by admin/cron endpoints.
 */

import { pgClient } from '@/lib/db'
import { getLearningStatus } from './compound-learning'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LawStatus = 'passing' | 'warning' | 'violation' | 'catastrophic'

export interface LawReport {
  law: number
  name: string
  status: LawStatus
  metric: number
  target: number
  unit: string
  detail: string
}

export interface PieComplianceReport {
  overallStatus: LawStatus
  laws: LawReport[]
  generatedAt: string
  censusSize: number
  totalRegions: number
  totalPriceCells: number
  filledCells: number
  coveragePct: number
}

// ---------------------------------------------------------------------------
// Compliance check
// ---------------------------------------------------------------------------

export async function getPieCompliance(): Promise<PieComplianceReport> {
  const sql = pgClient

  const [data] = await sql`SELECT * FROM openclaw.pie_compliance`
  const [census] = await sql`SELECT * FROM openclaw.census_coverage`

  const censusSize = Number(census?.total_census_ingredients ?? 0)
  const totalRegions = Number(census?.total_regions ?? 0)
  const totalPriceCells = Number(census?.total_price_cells_needed ?? 0)
  const filledCells = Number(census?.filled_price_cells ?? 0)
  const coveragePct = Number(census?.coverage_pct ?? 0)

  const laws: LawReport[] = [
    {
      law: 1,
      name: 'Total Autonomy',
      status: Number(data?.law1_human_inputs_today ?? 0) === 0 ? 'passing' : 'violation',
      metric: Number(data?.law1_human_inputs_today ?? 0),
      target: 0,
      unit: 'human inputs today',
      detail: 'Pi operates without human data input',
    },
    {
      law: 2,
      name: 'Universal Coverage',
      status: statusFromZeroTarget(Number(data?.law2_ingredients_with_zero_price ?? 0), censusSize),
      metric: Number(data?.law2_ingredients_with_zero_price ?? 0),
      target: 0,
      unit: 'ingredients with zero price in any region',
      detail: `${censusSize - Number(data?.law2_ingredients_with_zero_price ?? 0)}/${censusSize} ingredients have at least one price`,
    },
    {
      law: 3,
      name: 'Honesty Over Silence',
      status: Number(data?.law3_prices_without_confidence ?? 0) === 0 ? 'passing' : 'warning',
      metric: Number(data?.law3_prices_without_confidence ?? 0),
      target: 0,
      unit: 'prices without confidence score',
      detail: 'Every price has confidence + source attribution',
    },
    {
      law: 4,
      name: 'Freshness Guarantee',
      status: statusFromZeroTarget(Number(data?.law4_stale_prices ?? 0), filledCells),
      metric: Number(data?.law4_stale_prices ?? 0),
      target: 0,
      unit: 'stale prices (past freshness threshold)',
      detail: 'Volatile: 7d, Moderate: 14d, Stable: 30d',
    },
    {
      law: 5,
      name: 'Self-Healing',
      status: Number(data?.law5_unresolved_incidents ?? 0) === 0 ? 'passing' : 'warning',
      metric: Number(data?.law5_unresolved_incidents ?? 0),
      target: 0,
      unit: 'unresolved pipeline incidents',
      detail: 'Broken scrapers auto-recover, bad data auto-quarantined',
    },
    {
      law: 6,
      name: 'Geographic Intelligence',
      status: totalRegions > 0 ? 'passing' : 'catastrophic',
      metric: totalRegions,
      target: 400,
      unit: 'active pricing regions',
      detail: `${totalRegions} regions active, target ~400 US market areas`,
    },
    await (async () => {
      try {
        const learning = await getLearningStatus()
        const hasData = learning.resolvedPredictions > 10
        const accuracy = learning.currentMonthAccuracy ?? 0
        const improved = learning.improved

        let status: LawStatus = 'warning'
        if (!hasData)
          status = 'warning' // not enough data yet
        else if (accuracy >= 70) status = 'passing'
        else if (accuracy >= 50) status = 'warning'
        else status = 'violation'

        // If we have two months and accuracy declined, downgrade
        if (hasData && improved === false && status === 'passing') {
          status = 'warning'
        }

        return {
          law: 7,
          name: 'Compound Learning',
          status,
          metric: Math.round(accuracy * 10) / 10,
          target: 70,
          unit: '% predictions within 15% of actual',
          detail: hasData
            ? `${learning.resolvedPredictions} resolved predictions. ` +
              `Accuracy: ${accuracy}%. ` +
              `MAE: ${learning.meanAbsErrorPct ?? 'N/A'}%. ` +
              (improved === true
                ? 'Improving.'
                : improved === false
                  ? 'Declining.'
                  : 'First month.')
            : `${learning.totalPredictions} predictions recorded, ${learning.resolvedPredictions} resolved. Collecting data.`,
        } as LawReport
      } catch {
        return {
          law: 7,
          name: 'Compound Learning',
          status: 'warning' as LawStatus,
          metric: 0,
          target: 70,
          unit: '% predictions within 15% of actual',
          detail: 'Learning tables not yet populated. Run compound learning cron.',
        } as LawReport
      }
    })(),
    {
      law: 8,
      name: 'The Census',
      status: censusSize > 0 ? (censusSize >= 7800 ? 'passing' : 'warning') : 'catastrophic',
      metric: censusSize,
      target: 10000,
      unit: 'ingredients in census',
      detail: `USDA SR Legacy: 7,793. Target: 10,000+. Current: ${censusSize}`,
    },
    {
      law: 9,
      name: 'Synthetic Pricing',
      status: Number(data?.law9_active_synthetics ?? 0) > 0 ? 'passing' : 'warning',
      metric: Number(data?.law9_active_synthetics ?? 0),
      target: 0,
      unit: 'active synthetic prices',
      detail: 'Synthetics fill gaps where no real observation exists',
    },
    {
      law: 10,
      name: 'No Unprotected Price',
      status: statusFromZeroTarget(Number(data?.law10_unprotected_ingredients ?? 0), censusSize),
      metric: Number(data?.law10_unprotected_ingredients ?? 0),
      target: 0,
      unit: 'unprotected ingredients (no real or synthetic price)',
      detail: 'Every census ingredient must have a fallback chain',
    },
  ]

  const overallStatus = laws.reduce<LawStatus>((worst, law) => {
    const order: LawStatus[] = ['passing', 'warning', 'violation', 'catastrophic']
    return order.indexOf(law.status) > order.indexOf(worst) ? law.status : worst
  }, 'passing')

  return {
    overallStatus,
    laws,
    generatedAt: new Date().toISOString(),
    censusSize,
    totalRegions,
    totalPriceCells,
    filledCells,
    coveragePct,
  }
}

function statusFromZeroTarget(value: number, total: number): LawStatus {
  if (value === 0) return 'passing'
  if (total === 0) return 'catastrophic'
  const pct = value / total
  if (pct > 0.5) return 'catastrophic'
  if (pct > 0.1) return 'violation'
  return 'warning'
}
