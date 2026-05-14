import { requireAdmin } from '@/lib/auth/admin'
import { getPricingEngineCoverage } from '@/lib/pricing/region-coverage-actions'
import { getLearningStatus, type LearningStatus } from '@/lib/pricing/compound-learning'
import { getAccuracyStats } from '@/lib/pricing/receipt-price-bridge'
import { summarizeRegionReliability } from '@/lib/pricing/pie-reliability'
import { PricingHealthDashboard } from './pricing-health-dashboard'

export const metadata = {
  title: 'Pricing Engine Health | Admin',
}

export default async function PricingHealthPage() {
  await requireAdmin()

  const [coverage, learningStatus, receiptAccuracy] = await Promise.all([
    getPricingEngineCoverage(),
    getLearningStatus().catch(
      (): LearningStatus => ({
        totalPredictions: 0,
        resolvedPredictions: 0,
        unresolvedPredictions: 0,
        currentMonthAccuracy: null,
        priorMonthAccuracy: null,
        improved: null,
        meanAbsErrorPct: null,
        byMethod: [],
      })
    ),
    getAccuracyStats().catch(() => ({
      totalComparisons: 0,
      accurateCount: 0,
      accuracyPct: 0,
      avgDeviationPct: 0,
      byTier: [],
    })),
  ])

  return (
    <PricingHealthDashboard
      data={coverage}
      learningStatus={learningStatus}
      receiptAccuracy={receiptAccuracy}
      reliabilitySummary={summarizeRegionReliability(coverage.regionCoverage)}
    />
  )
}
