'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PipelineSummary {
  totalOpenInquiries: number
  estimatedPipelineValueCents: number
  expectedConversionValueCents: number
  historicalConversionRate: number // 0-100
  avgDaysToConvert: number | null
  urgentCount: number // inquiries needing response
  weekTrend: 'up' | 'down' | 'stable' // vs prior week
  weekInquiryCount: number
  priorWeekInquiryCount: number
}

// ─── Main Action ─────────────────────────────────────────────────────────────

export async function getPipelineSummary(): Promise<PipelineSummary | null> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000)

  const [openRes, historicalRes, thisWeekRes, lastWeekRes] = await Promise.all([
    // Open inquiries for pipeline value
    db
      .from('inquiries')
      .select('id, status, confirmed_budget_cents, created_at')
      .eq('tenant_id', tenantId)
      .in('status', ['new', 'awaiting_response', 'awaiting_chef', 'awaiting_client', 'quoted']),
    // Historical closed inquiries for conversion rate
    db
      .from('inquiries')
      .select('id, status, created_at, updated_at')
      .eq('tenant_id', tenantId)
      .in('status', ['converted', 'declined', 'expired'])
      .order('created_at', { ascending: false })
      .limit(200),
    // This week's new inquiries
    db
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', oneWeekAgo.toISOString()),
    // Last week's new inquiries
    db
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', twoWeeksAgo.toISOString())
      .lt('created_at', oneWeekAgo.toISOString()),
  ])

  const open = openRes.data || []
  const historical = historicalRes.data || []

  if (open.length === 0 && historical.length === 0) return null

  // Pipeline value
  const pipelineValueCents = open.reduce(
    (s: number, i: any) => s + (i.confirmed_budget_cents || 0),
    0
  )

  // Conversion rate
  const converted = historical.filter((h: any) => h.status === 'converted')
  const conversionRate =
    historical.length >= 5 ? Math.round((converted.length / historical.length) * 100) : 0

  // Expected value
  const expectedValueCents = Math.round(pipelineValueCents * (conversionRate / 100))

  // Avg days to convert
  const conversionDays = converted
    .map((c: any) => {
      const days = Math.round(
        (new Date(c.updated_at).getTime() - new Date(c.created_at).getTime()) / 86400000
      )
      return days > 0 && days < 180 ? days : null
    })
    .filter((d: number | null): d is number => d !== null)
  const avgDays =
    conversionDays.length >= 3
      ? Math.round(
          conversionDays.reduce((s: number, d: number) => s + d, 0) / conversionDays.length
        )
      : null

  // Urgent count (new + awaiting_chef, unanswered for 12+ hours)
  const urgentCount = open.filter((i: any) => {
    if (i.status !== 'new' && i.status !== 'awaiting_chef') return false
    const hours = (now.getTime() - new Date(i.created_at).getTime()) / 3600000
    return hours >= 12
  }).length

  // Week trend
  const thisWeek = thisWeekRes.count || 0
  const lastWeek = lastWeekRes.count || 0
  const trend: PipelineSummary['weekTrend'] =
    thisWeek > lastWeek * 1.2 ? 'up' : thisWeek < lastWeek * 0.8 ? 'down' : 'stable'

  return {
    totalOpenInquiries: open.length,
    estimatedPipelineValueCents: pipelineValueCents,
    expectedConversionValueCents: expectedValueCents,
    historicalConversionRate: conversionRate,
    avgDaysToConvert: avgDays,
    urgentCount,
    weekTrend: trend,
    weekInquiryCount: thisWeek,
    priorWeekInquiryCount: lastWeek,
  }
}
