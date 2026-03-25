'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  generateInsights,
  type BusinessMetrics,
  type BusinessInsights,
} from '@/lib/formulas/business-insights'

/**
 * Gathers BusinessMetrics from the database and returns computed BusinessInsights.
 * All data is tenant-scoped. No AI involved: pure deterministic formula.
 */
export async function getBusinessHealthInsights(): Promise<BusinessInsights> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!
  const now = new Date()
  const currentYear = now.getFullYear()
  const yearStart = `${currentYear}-01-01`

  // Run independent queries in parallel
  const [
    completedEventsRes,
    ytdRevenueRes,
    ytdExpensesRes,
    activeInquiriesRes,
    closedBookedRes,
    closedDeclinedExpiredRes,
    totalClientsRes,
    newClientsRes,
    monthlyEventsRes,
  ] = await Promise.all([
    // Completed events this year
    db
      .from('events')
      .select('id, quoted_price_cents', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .gte('event_date', yearStart),

    // YTD revenue from ledger (payments received)
    db
      .from('ledger_entries')
      .select('amount_cents')
      .eq('tenant_id', tenantId)
      .eq('type', 'payment')
      .gte('created_at', yearStart),

    // YTD expenses from ledger
    db
      .from('ledger_entries')
      .select('amount_cents')
      .eq('tenant_id', tenantId)
      .eq('type', 'expense')
      .gte('created_at', yearStart),

    // Active inquiries (new, contacted, follow_up)
    db
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['new', 'contacted', 'follow_up']),

    // Closed inquiries - booked
    db
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'booked'),

    // Closed inquiries - declined + expired
    db
      .from('inquiries')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['declined', 'expired']),

    // Total clients
    db.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),

    // New clients this year
    db
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', yearStart),

    // Events by month (for seasonality) - all completed events
    db.from('events').select('event_date').eq('tenant_id', tenantId).eq('status', 'completed'),
  ])

  // Parse completed events
  const completedEvents = completedEventsRes.data || []
  const completedEventCount = completedEventsRes.count ?? completedEvents.length

  // Calculate average event size from quoted_price_cents
  const totalQuotedCents = completedEvents.reduce(
    (sum: number, e: { quoted_price_cents: number | null }) => sum + (e.quoted_price_cents ?? 0),
    0
  )
  const avgEventSizeCents =
    completedEventCount > 0 ? Math.round(totalQuotedCents / completedEventCount) : 0

  // Sum YTD revenue
  const ytdRevenueCents = (ytdRevenueRes.data || []).reduce(
    (sum: number, e: { amount_cents: number }) => sum + e.amount_cents,
    0
  )

  // Sum YTD expenses
  const ytdExpenseCents = (ytdExpensesRes.data || []).reduce(
    (sum: number, e: { amount_cents: number }) => sum + Math.abs(e.amount_cents),
    0
  )

  // Inquiry metrics
  const activeInquiries = activeInquiriesRes.count ?? 0
  const bookedCount = closedBookedRes.count ?? 0
  const declinedExpiredCount = closedDeclinedExpiredRes.count ?? 0
  const closedInquiries = bookedCount + declinedExpiredCount
  const conversionRate = closedInquiries > 0 ? Math.round((bookedCount / closedInquiries) * 100) : 0

  // Client metrics
  const totalClients = totalClientsRes.count ?? 0
  const newClientsThisYear = newClientsRes.count ?? 0

  // Monthly distribution for seasonality
  const monthlyDistribution: Record<number, number> = {}
  for (let m = 1; m <= 12; m++) monthlyDistribution[m] = 0

  for (const ev of monthlyEventsRes.data || []) {
    if (ev.event_date) {
      const month = new Date(ev.event_date).getMonth() + 1
      monthlyDistribution[month] = (monthlyDistribution[month] || 0) + 1
    }
  }

  // Find peak month
  let peakMonth: { month: number; count: number } | null = null
  for (const [m, count] of Object.entries(monthlyDistribution)) {
    if (count > 0 && (!peakMonth || count > peakMonth.count)) {
      peakMonth = { month: parseInt(m, 10), count }
    }
  }

  const metrics: BusinessMetrics = {
    ytdRevenueCents,
    ytdExpenseCents,
    completedEventCount,
    avgEventSizeCents,
    activeInquiries,
    conversionRate,
    closedInquiries,
    totalClients,
    newClientsThisYear,
    peakMonth,
    currentMonth: now.getMonth() + 1,
    monthlyDistribution,
  }

  return generateInsights(metrics)
}
