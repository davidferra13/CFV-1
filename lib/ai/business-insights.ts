'use server'

// Business Insights - Deterministic Decision Tree
// Rules-based insight generation from computed business metrics.
// No AI needed: the thresholds are defined, the recommendations are specific,
// and template strings produce consistent, honest results every time.
//
// Previously used Ollama to generate narrative insights from business data.
// Removed: the talk on LLM limitations showed AI pattern-matches on labels
// and training data frequency rather than reasoning about the actual business.
// A chef with $200 revenue and 1 event doesn't need AI to tell them
// "pipeline is thin." A formula says the same thing, faster, for free, and
// it won't hallucinate an insight that sounds smart but is wrong.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import {
  generateInsights,
  type BusinessInsights,
  type InsightCard,
} from '@/lib/formulas/business-insights'

// Re-export types for consumers
export type { BusinessInsights, InsightCard }

// ── Server Action ─────────────────────────────────────────────────────────

export async function getBusinessInsights(): Promise<BusinessInsights> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const now = new Date()
  const thisYear = now.getFullYear()
  const ytdStart = `${thisYear}-01-01`

  const [eventsResult, clientsResult, expensesResult, inquiriesResult] = await Promise.all([
    supabase
      .from('events')
      .select('status, event_date, quoted_price_cents, occasion, guest_count')
      .eq('tenant_id', user.tenantId!)
      .order('event_date', { ascending: false })
      .limit(50),
    supabase
      .from('clients')
      .select('id, full_name, created_at')
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('expenses')
      .select('amount_cents, category, created_at')
      .eq('tenant_id', user.tenantId!)
      .gte('created_at', ytdStart)
      .limit(200),
    supabase
      .from('inquiries')
      .select('status, created_at, confirmed_budget_cents')
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const events = eventsResult.data ?? []
  const clients = clientsResult.data ?? []
  const expenses = expensesResult.data ?? []
  const inquiries = inquiriesResult.data ?? []

  // Compute summary stats
  const completedEvents = events.filter((e: any) => e.status === 'completed')
  const ytdRevenueCents = completedEvents
    .filter((e: any) => e.event_date && e.event_date >= ytdStart)
    .reduce((s: number, e: any) => s + (e.quoted_price_cents ?? 0), 0)
  const ytdExpenseCents = expenses.reduce((s: number, e: any) => s + (e.amount_cents ?? 0), 0)
  const avgEventSizeCents =
    completedEvents.length > 0
      ? Math.round(
          completedEvents.reduce((s: number, e: any) => s + (e.quoted_price_cents ?? 0), 0) /
            completedEvents.length
        )
      : 0
  const conversionCount = inquiries.filter((i: any) => i.status === 'confirmed').length
  const closedInquiries = inquiries.filter((i: any) =>
    ['confirmed', 'declined', 'expired'].includes(i.status)
  ).length
  const conversionRate =
    closedInquiries > 0 ? Math.round((conversionCount / closedInquiries) * 100) : 0
  const activeInquiries = inquiries.filter(
    (i: any) => !['confirmed', 'declined', 'expired'].includes(i.status)
  ).length

  // Monthly event distribution
  const monthCounts: Record<number, number> = {}
  completedEvents.forEach((e: any) => {
    if (e.event_date) {
      const m = new Date(e.event_date).getMonth() + 1
      monthCounts[m] = (monthCounts[m] ?? 0) + 1
    }
  })
  const peakEntry = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]
  const peakMonth = peakEntry ? { month: Number(peakEntry[0]), count: peakEntry[1] } : null

  // Pure formula. Decision tree + template strings. Instant. Free. Deterministic.
  return generateInsights({
    ytdRevenueCents,
    ytdExpenseCents,
    completedEventCount: completedEvents.length,
    avgEventSizeCents,
    activeInquiries,
    conversionRate,
    closedInquiries,
    totalClients: clients.length,
    newClientsThisYear: clients.filter((c: any) => c.created_at?.startsWith(String(thisYear)))
      .length,
    peakMonth,
    currentMonth: now.getMonth() + 1,
    monthlyDistribution: monthCounts,
  })
}
