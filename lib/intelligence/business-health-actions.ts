'use server'

// Business Health Score - Server Actions
// Wraps the existing business-health-summary engine with additional
// historical tracking and detailed breakdown for the health score page.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { getBusinessHealthSummary, type BusinessHealthSummary } from './business-health-summary'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface HealthScoreDetail {
  summary: BusinessHealthSummary
  trend: 'improving' | 'stable' | 'declining'
  strengths: string[]
  risks: string[]
  history: HealthHistoryPoint[]
  quadrants: {
    revenue: QuadrantDetail
    clients: QuadrantDetail
    operations: QuadrantDetail
    growth: QuadrantDetail
  }
}

export interface QuadrantDetail {
  score: number
  label: string
  color: string
  factors: QuadrantFactor[]
}

export interface QuadrantFactor {
  label: string
  value: string
  impact: 'positive' | 'neutral' | 'negative'
}

export interface HealthHistoryPoint {
  date: string
  score: number
}

// ── Main Actions ──────────────────────────────────────────────────────────────

export async function fetchBusinessHealthScore(): Promise<HealthScoreDetail> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Get the composite health summary
  const summary = await getBusinessHealthSummary()
  const { scores } = summary

  // Build quadrant details
  const quadrants = await buildQuadrantDetails(tenantId, db, scores)

  // Determine trend from historical data
  const history = await getHealthHistory(tenantId, db, scores.overall)

  let trend: 'improving' | 'stable' | 'declining' = 'stable'
  if (history.length >= 3) {
    const recentAvg = history.slice(-3).reduce((s, h) => s + h.score, 0) / 3
    const olderAvg = history.slice(0, Math.min(3, history.length - 3)).reduce((s, h) => s + h.score, 0) /
      Math.min(3, history.length - 3)
    if (recentAvg > olderAvg + 5) trend = 'improving'
    else if (recentAvg < olderAvg - 5) trend = 'declining'
  }

  // Extract strengths and risks from alerts
  const strengths: string[] = []
  const risks: string[] = []

  if (scores.revenue >= 70) strengths.push('Strong revenue health')
  if (scores.clients >= 70) strengths.push('Healthy client base')
  if (scores.operations >= 70) strengths.push('Efficient operations')
  if (scores.growth >= 70) strengths.push('Positive growth trajectory')

  if (scores.revenue < 40) risks.push('Revenue needs attention')
  if (scores.clients < 40) risks.push('Client retention at risk')
  if (scores.operations < 40) risks.push('Operational bottlenecks')
  if (scores.growth < 40) risks.push('Growth has stalled')

  // Add alert-based insights
  for (const alert of summary.alerts.slice(0, 3)) {
    if (alert.severity === 'critical' || alert.severity === 'warning') {
      risks.push(alert.title)
    } else if (alert.severity === 'opportunity') {
      strengths.push(alert.title)
    }
  }

  return {
    summary,
    trend,
    strengths: strengths.slice(0, 3),
    risks: risks.slice(0, 3),
    history,
    quadrants,
  }
}

export async function fetchBusinessHealthSummaryOnly(): Promise<BusinessHealthSummary> {
  await requireChef()
  return getBusinessHealthSummary()
}

// ── Quadrant Builder ──────────────────────────────────────────────────────────

async function buildQuadrantDetails(
  tenantId: string,
  db: any,
  scores: { revenue: number; clients: number; operations: number; growth: number }
): Promise<HealthScoreDetail['quadrants']> {
  // Fetch basic stats for factor details
  const [eventCountResult, clientCountResult, inquiryCountResult] = await Promise.all([
    db
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .is('deleted_at' as any, null)
      .not('status', 'in', '("cancelled")'),
    db
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    db
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .not('status', 'in', '("converted","declined")'),
  ])

  const eventCount = eventCountResult?.count ?? 0
  const clientCount = clientCountResult?.count ?? 0
  const openInquiries = inquiryCountResult?.count ?? 0

  // Get recent 90-day event count
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const dateStr = ninetyDaysAgo.toISOString().split('T')[0]

  const { count: recentEvents } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .gte('event_date', dateStr)
    .not('status', 'in', '("cancelled")')

  // Get repeat client count
  const { data: repeatData } = await db
    .from('events')
    .select('client_id')
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .not('status', 'in', '("cancelled")')
    .not('client_id', 'is', null)

  const clientEventCounts = new Map<string, number>()
  for (const row of (repeatData ?? []) as any[]) {
    if (!row.client_id) continue
    clientEventCounts.set(row.client_id, (clientEventCounts.get(row.client_id) ?? 0) + 1)
  }
  const repeatClients = Array.from(clientEventCounts.values()).filter((c) => c > 1).length

  return {
    revenue: {
      score: scores.revenue,
      label: 'Revenue Health',
      color: getScoreColor(scores.revenue),
      factors: [
        {
          label: 'Total events',
          value: String(eventCount),
          impact: eventCount > 5 ? 'positive' : eventCount > 0 ? 'neutral' : 'negative',
        },
        {
          label: 'Recent events (90 days)',
          value: String(recentEvents ?? 0),
          impact: (recentEvents ?? 0) >= 3 ? 'positive' : (recentEvents ?? 0) > 0 ? 'neutral' : 'negative',
        },
      ],
    },
    clients: {
      score: scores.clients,
      label: 'Client Retention',
      color: getScoreColor(scores.clients),
      factors: [
        {
          label: 'Total clients',
          value: String(clientCount),
          impact: clientCount >= 5 ? 'positive' : clientCount > 0 ? 'neutral' : 'negative',
        },
        {
          label: 'Repeat clients',
          value: String(repeatClients),
          impact: repeatClients >= 3 ? 'positive' : repeatClients > 0 ? 'neutral' : 'negative',
        },
      ],
    },
    operations: {
      score: scores.operations,
      label: 'Operational Efficiency',
      color: getScoreColor(scores.operations),
      factors: [
        {
          label: 'Open inquiries',
          value: String(openInquiries),
          impact: openInquiries > 0 ? 'positive' : 'neutral',
        },
        {
          label: 'Events in last 90 days',
          value: String(recentEvents ?? 0),
          impact: (recentEvents ?? 0) >= 2 ? 'positive' : 'neutral',
        },
      ],
    },
    growth: {
      score: scores.growth,
      label: 'Growth Trajectory',
      color: getScoreColor(scores.growth),
      factors: [
        {
          label: 'Active pipeline',
          value: `${openInquiries} inquiries`,
          impact: openInquiries >= 3 ? 'positive' : openInquiries > 0 ? 'neutral' : 'negative',
        },
        {
          label: 'Client base growth',
          value: `${clientCount} total`,
          impact: clientCount >= 10 ? 'positive' : clientCount > 0 ? 'neutral' : 'negative',
        },
      ],
    },
  }
}

// ── Health History ─────────────────────────────────────────────────────────────

async function getHealthHistory(
  tenantId: string,
  db: any,
  currentScore: number
): Promise<HealthHistoryPoint[]> {
  // Build a synthetic 6-month history based on event activity per month
  // This gives a meaningful trend without storing health score snapshots
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const dateStr = sixMonthsAgo.toISOString().split('T')[0]

  const { data: events } = await db
    .from('events')
    .select('event_date, status, amount_paid_cents')
    .eq('tenant_id', tenantId)
    .is('deleted_at' as any, null)
    .gte('event_date', dateStr)
    .not('status', 'in', '("cancelled")')
    .order('event_date', { ascending: true })

  const history: HealthHistoryPoint[] = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthLabel = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

    const monthEvents = ((events ?? []) as any[]).filter((e) =>
      (e.event_date as string).startsWith(monthStr)
    )

    // Simple scoring: events per month contribute to monthly score
    const eventScore = Math.min(30, monthEvents.length * 8)
    const revenueScore = Math.min(25, monthEvents.reduce((s: number, e: any) =>
      s + Math.min(5, ((e.amount_paid_cents ?? 0) / 200000)), 0) * 5)
    const completedScore = Math.min(25, monthEvents.filter((e: any) =>
      e.status === 'completed').length * 8)

    // Base score + monthly performance
    const baseScore = 20
    const monthScore = Math.min(100, Math.round(baseScore + eventScore + revenueScore + completedScore))

    history.push({
      date: monthLabel,
      score: i === 0 ? currentScore : monthScore,
    })
  }

  return history
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 70) return 'emerald'
  if (score >= 40) return 'amber'
  return 'red'
}
