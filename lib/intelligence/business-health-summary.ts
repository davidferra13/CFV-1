'use server'

import { requireChef } from '@/lib/auth/get-user'
import { getSeasonalDemandForecast } from './seasonal-demand'
import { getRebookingPredictions } from './rebooking-predictions'
import { getCashFlowProjection } from './cashflow-projections'
import { getSchedulingIntelligence } from './smart-scheduling'
import { getInquiryTriage } from './inquiry-triage'
import { getPriceAnomalies } from './price-anomaly'
import { getChurnPreventionTriggers } from './churn-prevention-triggers'
import { getCapacityCeiling } from './capacity-ceiling'
import { getPriceElasticity } from './price-elasticity'
import { getClientLifetimeJourneys } from './client-lifetime-journey'
import { getEventProfitability } from './event-profitability'
import { getVendorPriceIntelligence } from './vendor-price-tracking'
import { getCommunicationCadence } from './client-communication-cadence'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BusinessAlert {
  severity: 'critical' | 'warning' | 'info' | 'opportunity'
  category: string
  title: string
  detail: string
  action: string
  source: string // which engine generated this
}

export interface BusinessHealthScore {
  overall: number // 0-100
  revenue: number // 0-100
  clients: number // 0-100
  operations: number // 0-100
  growth: number // 0-100
}

export interface BusinessHealthSummary {
  scores: BusinessHealthScore
  alerts: BusinessAlert[]
  topInsights: string[] // max 5, plain English
  remyContext: string // condensed paragraph for Remy's system prompt
  generatedAt: string
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getBusinessHealthSummary(): Promise<BusinessHealthSummary> {
  await requireChef()

  // Fetch key engines in parallel — catch nulls gracefully
  const [
    demand,
    rebooking,
    cashflow,
    scheduling,
    triage,
    anomalies,
    churn,
    capacity,
    elasticity,
    journeys,
    profitability,
    vendors,
    cadence,
  ] = await Promise.all([
    getSeasonalDemandForecast().catch(() => null),
    getRebookingPredictions().catch(() => null),
    getCashFlowProjection().catch(() => null),
    getSchedulingIntelligence().catch(() => null),
    getInquiryTriage().catch(() => null),
    getPriceAnomalies().catch(() => null),
    getChurnPreventionTriggers().catch(() => null),
    getCapacityCeiling().catch(() => null),
    getPriceElasticity().catch(() => null),
    getClientLifetimeJourneys().catch(() => null),
    getEventProfitability().catch(() => null),
    getVendorPriceIntelligence().catch(() => null),
    getCommunicationCadence().catch(() => null),
  ])

  const alerts: BusinessAlert[] = []
  const insights: string[] = []

  // ─── Revenue Health ───

  let revenueScore = 50
  if (cashflow) {
    const projectedMonths = cashflow.projected || []
    const positiveMonths = projectedMonths.filter((m) => m.incomeCents > 0).length
    revenueScore = Math.min(
      100,
      Math.round((positiveMonths / Math.max(projectedMonths.length, 1)) * 100)
    )

    if (cashflow.avgMonthlyNetCents < 0) {
      alerts.push({
        severity: 'critical',
        category: 'Revenue',
        title: 'Negative cash flow trend',
        detail: `Avg monthly net: -$${Math.round(Math.abs(cashflow.avgMonthlyNetCents) / 100)}`,
        action: 'Review upcoming bookings and expenses',
        source: 'cashflow-projections',
      })
    }
  }

  if (profitability) {
    const avgMargin = profitability.avgMarginPercent
    if (avgMargin !== null && avgMargin !== undefined) {
      if (avgMargin < 20) {
        alerts.push({
          severity: 'warning',
          category: 'Profitability',
          title: 'Low profit margins',
          detail: `Average margin: ${avgMargin}%`,
          action: 'Review pricing or reduce expenses',
          source: 'event-profitability',
        })
        revenueScore = Math.max(20, revenueScore - 20)
      } else if (avgMargin > 50) {
        revenueScore = Math.min(100, revenueScore + 15)
      }
      insights.push(`Average profit margin: ${avgMargin}%`)
    }
  }

  if (elasticity) {
    if (elasticity.priceIncreaseHeadroom > 10) {
      alerts.push({
        severity: 'opportunity',
        category: 'Pricing',
        title: `~${elasticity.priceIncreaseHeadroom}% price increase headroom`,
        detail: elasticity.insight || 'Room to raise prices without losing bookings',
        action: 'Consider testing higher pricing on next quotes',
        source: 'price-elasticity',
      })
    }
  }

  // ─── Client Health ───

  let clientScore = 50
  if (churn) {
    const critical = churn.atRiskClients?.filter((c) => c.riskLevel === 'critical').length || 0
    const high = churn.atRiskClients?.filter((c) => c.riskLevel === 'high').length || 0

    if (critical > 0) {
      alerts.push({
        severity: 'critical',
        category: 'Client Retention',
        title: `${critical} client${critical > 1 ? 's' : ''} at critical churn risk`,
        detail:
          churn.atRiskClients
            ?.filter((c) => c.riskLevel === 'critical')
            .slice(0, 3)
            .map((c) => c.clientName)
            .join(', ') || '',
        action: 'Reach out immediately with re-engagement offer',
        source: 'churn-prevention',
      })
      clientScore = Math.max(10, clientScore - critical * 15)
    }
    if (high > 0) {
      alerts.push({
        severity: 'warning',
        category: 'Client Retention',
        title: `${high} client${high > 1 ? 's' : ''} at high churn risk`,
        detail: 'Declining engagement or spend detected',
        action: 'Schedule follow-up within 2 weeks',
        source: 'churn-prevention',
      })
      clientScore = Math.max(20, clientScore - high * 8)
    }
  }

  if (journeys) {
    const champions = journeys.journeys?.filter((c) => c.stage === 'champion').length || 0
    const loyals = journeys.journeys?.filter((c) => c.stage === 'loyal').length || 0
    const dormant = journeys.journeys?.filter((c) => c.stage === 'dormant').length || 0
    const total = journeys.journeys?.length || 1

    const healthyPct = Math.round(((champions + loyals) / total) * 100)
    clientScore = Math.min(100, Math.max(clientScore, healthyPct))

    if (champions + loyals > 0) {
      insights.push(`${champions + loyals} loyal/champion clients (${healthyPct}% of portfolio)`)
    }
    if (dormant > 2) {
      insights.push(`${dormant} dormant clients — re-engagement opportunity`)
    }
  }

  if (rebooking) {
    const overdueCount = rebooking.overdueRebookers?.length || 0
    const upcomingCount = rebooking.upcomingRebookers?.length || 0
    const dueNow = overdueCount + upcomingCount
    if (dueNow > 0) {
      alerts.push({
        severity: overdueCount > 0 ? 'warning' : 'info',
        category: 'Rebooking',
        title: `${dueNow} client${dueNow > 1 ? 's' : ''} due for rebooking`,
        detail:
          overdueCount > 0
            ? `${overdueCount} overdue, ${upcomingCount} upcoming`
            : 'Based on historical booking cadence',
        action: 'Send rebooking outreach',
        source: 'rebooking-predictions',
      })
    }
  }

  // ─── Operations Health ───

  let opsScore = 50
  if (capacity) {
    const utilization = capacity.currentUtilization || 0
    if (utilization > 90) {
      alerts.push({
        severity: 'warning',
        category: 'Capacity',
        title: `Operating at ${utilization}% capacity`,
        detail: 'Near maximum — burnout risk',
        action: 'Consider raising prices or limiting bookings',
        source: 'capacity-ceiling',
      })
      opsScore = 40
    } else if (utilization > 70) {
      opsScore = 80
      insights.push(`Healthy utilization: ${utilization}% of capacity`)
    } else if (utilization < 30) {
      opsScore = 35
      insights.push(`Low utilization: ${utilization}% — room for more bookings`)
    } else {
      opsScore = 60
    }

    const bottlenecks = capacity.bottlenecks?.length || 0
    if (bottlenecks > 0) {
      opsScore = Math.max(20, opsScore - bottlenecks * 10)
    }
  }

  if (scheduling) {
    const critSuggestions =
      scheduling.suggestions?.filter(
        (s) => s.severity === 'critical' || s.severity === 'warning'
      ) || []
    if (critSuggestions.length > 0) {
      const top = critSuggestions[0]
      alerts.push({
        severity: top.severity === 'critical' ? 'critical' : 'warning',
        category: 'Scheduling',
        title: top.title,
        detail: top.description,
        action: 'Review calendar',
        source: 'smart-scheduling',
      })
      opsScore = Math.max(20, opsScore - critSuggestions.length * 10)
    }
  }

  if (vendors) {
    const priceAlerts = vendors.alerts?.filter((a: any) => a.type === 'price_increase').length || 0
    if (priceAlerts > 0) {
      alerts.push({
        severity: 'info',
        category: 'Vendors',
        title: `${priceAlerts} vendor price increase${priceAlerts > 1 ? 's' : ''} detected`,
        detail: 'Expenses trending up for some vendors',
        action: 'Review vendor pricing and consider alternatives',
        source: 'vendor-price-tracking',
      })
    }
  }

  if (cadence) {
    const silent = cadence.silentClients?.length || 0
    if (silent > 3) {
      alerts.push({
        severity: 'info',
        category: 'Communication',
        title: `${silent} clients have gone silent`,
        detail: 'No communication in extended period',
        action: 'Send check-in messages',
        source: 'communication-cadence',
      })
    }
  }

  // ─── Growth Health ───

  let growthScore = 50
  if (demand) {
    const forecast = demand.nextMonthForecast
    if (forecast && forecast.expectedEvents > 0) {
      growthScore = Math.min(100, 50 + forecast.expectedEvents * 5)
      insights.push(
        `Next month forecast: ${forecast.expectedEvents} events (~$${Math.round(forecast.expectedRevenueCents / 100)})`
      )
    }
    if (demand.peakSeasonMonths.length > 0) {
      const currentMonth = new Date().toLocaleString('en-US', { month: 'short' })
      if (demand.peakSeasonMonths.includes(currentMonth)) {
        growthScore = Math.min(100, growthScore + 10)
      }
    }
  }

  if (triage) {
    const highPriority = triage.urgentCount || 0
    if (highPriority > 0) {
      alerts.push({
        severity: 'opportunity',
        category: 'Pipeline',
        title: `${highPriority} high-priority inquir${highPriority > 1 ? 'ies' : 'y'} in pipeline`,
        detail: 'Strong leads waiting for response',
        action: 'Respond to high-priority inquiries first',
        source: 'inquiry-triage',
      })
      growthScore = Math.min(100, growthScore + highPriority * 5)
    }
  }

  if (anomalies) {
    const underpriced =
      anomalies.anomalies?.filter((a: any) => a.type === 'underpriced').length || 0
    if (underpriced > 0) {
      alerts.push({
        severity: 'opportunity',
        category: 'Pricing',
        title: `${underpriced} event${underpriced > 1 ? 's' : ''} may be underpriced`,
        detail: 'Revenue below expected range for similar events',
        action: 'Review pricing for these event types',
        source: 'price-anomaly',
      })
    }
  }

  // ─── Overall Score ───

  const overall = Math.round(
    revenueScore * 0.3 + clientScore * 0.3 + opsScore * 0.2 + growthScore * 0.2
  )

  const scores: BusinessHealthScore = {
    overall,
    revenue: revenueScore,
    clients: clientScore,
    operations: opsScore,
    growth: growthScore,
  }

  // Sort alerts: critical → warning → opportunity → info
  const severityOrder = { critical: 0, warning: 1, opportunity: 2, info: 3 }
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  // ─── Build Remy Context ───

  const remyParts: string[] = []
  remyParts.push(
    `Business health: ${overall}/100 (revenue: ${revenueScore}, clients: ${clientScore}, ops: ${opsScore}, growth: ${growthScore}).`
  )

  const critAlerts = alerts.filter((a) => a.severity === 'critical')
  if (critAlerts.length > 0) {
    remyParts.push(`URGENT: ${critAlerts.map((a) => a.title).join('; ')}.`)
  }

  const opps = alerts.filter((a) => a.severity === 'opportunity')
  if (opps.length > 0) {
    remyParts.push(`Opportunities: ${opps.map((a) => a.title).join('; ')}.`)
  }

  if (insights.length > 0) {
    remyParts.push(insights.slice(0, 3).join('. ') + '.')
  }

  return {
    scores,
    alerts: alerts.slice(0, 15),
    topInsights: insights.slice(0, 5),
    remyContext: remyParts.join(' '),
    generatedAt: new Date().toISOString(),
  }
}
