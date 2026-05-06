import { requireAdmin } from '@/lib/auth/admin'
import { isFounderEmail } from '@/lib/platform/owner-account'
import { notFound } from 'next/navigation'
import { getPricingEngineCoverage } from '@/lib/pricing/region-coverage-actions'
import { getLearningStatus, type LearningStatus } from '@/lib/pricing/compound-learning'
import { getAccuracyStats } from '@/lib/pricing/receipt-price-bridge'
import { PricingHealthDashboard } from './pricing-health-dashboard'

export const metadata = {
  title: 'Pricing Engine Health | Admin',
}

export default async function PricingHealthPage() {
  const admin = await requireAdmin()
  if (!isFounderEmail(admin.email)) {
    notFound()
  }

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
    />
  )
}
