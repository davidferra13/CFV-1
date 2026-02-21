'use server'

// Business Insights Narrative
// AI narrative layer over existing deterministic business data:
// pipeline forecast, seasonality, profitability, LTV ranking.
// Routed to Ollama (chef financial data is sensitive).
// Output is INSIGHT ONLY — never modifies any business records.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { parseWithOllama } from './parse-ollama'
import { z } from 'zod'

// ── Zod schema ──────────────────────────────────────────────────────────────

const InsightCardSchema = z.object({
  title: z.string(),
  insight: z.string(),      // 1–2 sentence plain-English finding
  action: z.string(),       // specific recommended action
  priority: z.enum(['high', 'medium', 'low']),
  category: z.enum(['revenue', 'clients', 'pricing', 'operations', 'seasonal', 'growth']),
})

const BusinessInsightsSchema = z.object({
  insights: z.array(InsightCardSchema),
  headline: z.string(),             // single most important insight
  healthScore: z.number().min(0).max(100), // overall business health 0-100
  healthLabel: z.enum(['thriving', 'healthy', 'needs_attention', 'at_risk']),
  confidence: z.enum(['high', 'medium', 'low']),
})

export type BusinessInsights = z.infer<typeof BusinessInsightsSchema>
export type InsightCard = z.infer<typeof InsightCardSchema>

// ── Server Action ─────────────────────────────────────────────────────────

export async function getBusinessInsights(): Promise<BusinessInsights> {
  const user = await requireChef()
  const supabase = createServerClient()

  const now = new Date()
  const thisYear = now.getFullYear()
  const thisMonth = now.getMonth() + 1
  const ytdStart = `${thisYear}-01-01`

  const [eventsResult, clientsResult, expensesResult, inquiriesResult] = await Promise.all([
    supabase
      .from('events')
      .select('status, event_date, quoted_price_cents, amount_paid_cents, occasion, guest_count')
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
      .select('amount_cents, category, date')
      .eq('tenant_id', user.tenantId!)
      .gte('date', ytdStart)
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
  const completedEvents = events.filter(e => e.status === 'completed')
  const ytdRevenue = completedEvents
    .filter(e => e.event_date && e.event_date >= ytdStart)
    .reduce((s, e) => s + (e.amount_paid_cents ?? e.quoted_price_cents ?? 0), 0)
  const ytdExpenses = expenses.reduce((s, e) => s + (e.amount_cents ?? 0), 0)
  const ytdProfit = ytdRevenue - ytdExpenses
  const avgEventSize = completedEvents.length > 0
    ? Math.round(completedEvents.reduce((s, e) => s + (e.quoted_price_cents ?? 0), 0) / completedEvents.length)
    : 0
  const conversionCount = inquiries.filter(i => i.status === 'converted').length
  const closedInquiries = inquiries.filter(i => ['converted', 'declined', 'expired'].includes(i.status)).length
  const conversionRate = closedInquiries > 0 ? Math.round((conversionCount / closedInquiries) * 100) : 0
  const activeInquiries = inquiries.filter(i => !['converted', 'declined', 'expired'].includes(i.status)).length

  // Monthly event distribution
  const monthCounts: Record<number, number> = {}
  completedEvents.forEach(e => {
    if (e.event_date) {
      const m = new Date(e.event_date).getMonth() + 1
      monthCounts[m] = (monthCounts[m] ?? 0) + 1
    }
  })
  const peakMonth = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]

  // Top clients by event count
  const clientEventMap: Record<string, number> = {}
  // (simplified — would need client_id join for real LTV)

  const systemPrompt = `You are a business intelligence analyst for a private chef business.
Generate 4–6 specific, actionable insights from the business data.
Be direct and honest — if something needs attention, say so clearly.
Each insight should give the chef something specific they can act on this week.
Health score: 80–100 = thriving, 60–79 = healthy, 40–59 = needs attention, 0–39 = at risk.
Return valid JSON only.`

  const userContent = `
BUSINESS SNAPSHOT (${now.toDateString()}):

Revenue & Events:
  Year-to-date revenue: $${(ytdRevenue / 100).toFixed(0)}
  Year-to-date expenses: $${(ytdExpenses / 100).toFixed(0)}
  Year-to-date profit: $${(ytdProfit / 100).toFixed(0)}
  Total completed events (all time): ${completedEvents.length}
  Average event size: $${(avgEventSize / 100).toFixed(0)}
  Current month: ${thisMonth}

Pipeline:
  Active inquiries: ${activeInquiries}
  Inquiry conversion rate: ${conversionRate}% (${conversionCount} of ${closedInquiries} closed)
  Recent inquiries (last 30): ${inquiries.length}

Clients:
  Total clients on file: ${clients.length}
  New clients (this year): ${clients.filter(c => c.created_at?.startsWith(String(thisYear))).length}

Seasonality:
  Peak month (by completed events): ${peakMonth ? `Month ${peakMonth[0]} (${peakMonth[1]} events)` : 'Insufficient data'}
  Monthly distribution: ${Object.entries(monthCounts).sort((a, b) => Number(a[0]) - Number(b[0])).map(([m, c]) => `M${m}:${c}`).join(', ') || 'No data'}

Return JSON: {
  "insights": [{ "title": "...", "insight": "...", "action": "...", "priority": "high|medium|low", "category": "revenue|clients|pricing|operations|seasonal|growth" }],
  "headline": "single most important insight",
  "healthScore": 0-100,
  "healthLabel": "thriving|healthy|needs_attention|at_risk",
  "confidence": "high|medium|low"
}`

  try {
    return await parseWithOllama(systemPrompt, userContent, BusinessInsightsSchema)
  } catch (err) {
    console.error('[business-insights] Failed:', err)
    throw new Error('Could not generate insights. Please try again.')
  }
}
