import { NextResponse } from 'next/server'
import { csvRowSafe as row } from '@/lib/security/csv-sanitize'
import { getClientContributionPortfolio } from '@/lib/client-contribution/actions'

function money(cents: number): string {
  return (cents / 100).toFixed(2)
}

export async function GET() {
  const portfolio = await getClientContributionPortfolio()
  const header = row([
    'Client',
    'Email',
    'Score',
    'Tier',
    'Fit Score',
    'Fit Level',
    'Fit Positive Drivers',
    'Fit Negative Drivers',
    'Portfolio Category',
    'Paid Revenue',
    'Net Profit',
    'Margin Percent',
    'Margin Leak Count',
    'Top Margin Leak',
    'Margin Leak Impact',
    'Outstanding Balance',
    'Completed Events',
    'Average Event Value',
    'Annualized Value',
    'Last Event',
    'Churn Risk',
    'Referral Potential',
    'Referral Network Score',
    'Referral Network Value',
    'Referral Network Action',
    'Acquisition Source',
    'Acquisition Source Known',
    'Capacity Score',
    'Capacity Recommendation',
    'Communication ROI Type',
    'Communication ROI Value',
    'Communication ROI Confidence',
    'Seasonality Label',
    'Seasonality Confidence',
    'Seasonality Next Month',
    'Seasonality Expected Value',
    'Seasonality Evidence',
    'Primary Market',
    'Primary Market Revenue',
    'Primary Market Profit',
    'Primary Market Margin',
    'Expectation Risk Score',
    'Expectation Risk Level',
    'Expectation Risk Drivers',
    'Expectation Risk Mitigations',
    'Operational Drag',
    'Recommended Action',
    'Pricing Recommendation',
    'Pricing Risk',
    'Pricing Evidence',
    'Review State',
    'Data Confidence',
    'Missing Data',
  ])
  const body = portfolio.snapshots.map((snapshot) =>
    row([
      snapshot.clientName,
      snapshot.email ?? '',
      String(snapshot.contributionScore),
      snapshot.tier,
      snapshot.fitScore.score == null ? '' : String(snapshot.fitScore.score),
      snapshot.fitScore.level,
      snapshot.fitScore.positiveDrivers.map((item) => `${item.label}: ${item.value}`).join('; '),
      snapshot.fitScore.negativeDrivers.map((item) => `${item.label}: ${item.value}`).join('; '),
      snapshot.portfolioCategory.label,
      money(snapshot.paidRevenueCents),
      money(snapshot.netProfitCents),
      snapshot.marginPercent == null ? '' : String(snapshot.marginPercent),
      String(snapshot.marginLeaks.length),
      snapshot.marginLeaks[0]?.label ?? '',
      money(snapshot.marginLeaks.reduce((sum, item) => sum + item.estimatedImpactCents, 0)),
      money(snapshot.outstandingBalanceCents),
      String(snapshot.completedEventCount),
      money(snapshot.averageEventValueCents),
      money(snapshot.annualizedValueCents),
      snapshot.lastEventDate ?? '',
      snapshot.churnRisk,
      snapshot.referralPotential,
      String(snapshot.referralNetworkValue.score),
      money(snapshot.referralNetworkValue.directReferralValueCents),
      snapshot.referralNetworkValue.recommendedAction,
      snapshot.acquisitionSource.label,
      snapshot.acquisitionSource.known ? 'yes' : 'no',
      String(snapshot.capacitySignal.score),
      snapshot.capacitySignal.label,
      snapshot.communicationRoi.label,
      money(snapshot.communicationRoi.revenueAfterTouchCents),
      snapshot.communicationRoi.confidence,
      snapshot.seasonality.label,
      snapshot.seasonality.confidence,
      snapshot.seasonality.nextLikelyWindow?.label ?? '',
      money(snapshot.seasonality.nextLikelyWindow?.expectedValueCents ?? 0),
      snapshot.seasonality.evidence.join('; '),
      snapshot.geographicContribution.primaryMarket?.label ?? '',
      money(snapshot.geographicContribution.primaryMarket?.revenueCents ?? 0),
      money(snapshot.geographicContribution.primaryMarket?.profitCents ?? 0),
      snapshot.geographicContribution.primaryMarket?.averageMarginPercent == null
        ? ''
        : String(snapshot.geographicContribution.primaryMarket.averageMarginPercent),
      String(snapshot.expectationRisk.score),
      snapshot.expectationRisk.level,
      snapshot.expectationRisk.evidence.map((item) => `${item.label}: ${item.value}`).join('; '),
      snapshot.expectationRisk.mitigations
        .map((item) => `${item.label}: ${item.reason}`)
        .join('; '),
      snapshot.operationalDrag,
      snapshot.recommendedAction,
      snapshot.pricingRecommendation.label,
      snapshot.pricingRecommendation.riskLabel,
      snapshot.pricingRecommendation.evidence.join('; '),
      snapshot.reviewState.status,
      snapshot.dataConfidence.level,
      snapshot.missingData.map((item) => item.label).join('; '),
    ])
  )

  const today = new Date()
  const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
    today.getDate()
  ).padStart(2, '0')}`

  return new NextResponse([header, ...body].join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="client-contribution-${stamp}.csv"`,
    },
  })
}
